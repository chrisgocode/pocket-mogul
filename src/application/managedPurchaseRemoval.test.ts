import { ownership, purchasePolicy } from './purchaseTesting';
import { scriptedBilling } from './scriptedBilling';
import { startObservedTestGame } from './testGame';

const managed = {
  ...ownership,
  verification: { ...ownership.verification, source: 'provider' },
  completion: { owner: 'provider' },
} as const;
const current = {
  status: 'current',
  authority: 'authoritative',
  coverage: 'complete',
  observedAtMs: 1_800_000_000_000,
  ownership: [managed],
  removals: [],
} as const;
const removed = { ...current, ownership: [], removals: [managed.reference] };

it('recovers managed delivery, removes it atomically and rejects stale managed replays after restart', async () => {
  const billing = scriptedBilling({
    completionOwner: 'provider',
    purchases: [{ status: 'completed', ownership: managed }],
    restores: [current, removed, removed],
  });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  session.faults.failWritesMatching = /INSERT INTO purchase_receipts/;
  expect(await session.game.purchases.purchase('test-exemption')).toEqual({ status: 'saveFailed' });
  session.faults.failWritesMatching = undefined;
  await session.game.purchases.restore();
  expect(session.game.getSnapshot().state.tax.status).toBe('exempt');
  const before = session.game.getSnapshot();
  session.faults.failWritesMatching = /INSERT INTO save_state/;
  expect(await session.game.purchases.restore()).toEqual({ status: 'saveFailed' });
  expect(session.game.getSnapshot()).toEqual(before);
  expect(await session.purchaseRecords()).toMatchObject([
    { completion: 'completed', currentOwnership: { status: 'active' } },
  ]);
  session.faults.failWritesMatching = undefined;
  await session.game.purchases.restore();
  const replay = scriptedBilling({
    completionOwner: 'provider',
    purchases: [{ status: 'completed', ownership: managed }],
    ownership: [current],
    restores: [current],
  });
  const back = await session.restart({ billing: replay });
  await back.game.purchases.purchase('test-exemption');
  await back.game.purchases.restore();
  expect(back.game.getSnapshot().state.tax.status).toBe('active');
  expect(await back.purchaseRecords()).toMatchObject([
    { completion: 'completed', currentOwnership: { status: 'removed' } },
  ]);
  expect(billing.completions).toEqual([]);
  expect(replay.completions).toEqual([]);
});

it('preserves a second managed source through reset and unavailable verification before final removal', async () => {
  const second = {
    ...managed,
    reference: { ...managed.reference, purchaseId: 'managed-second' },
  };
  const billing = scriptedBilling({
    completionOwner: 'provider',
    restores: [
      { ...current, ownership: [managed, second] },
      removed,
      { status: 'unavailable' },
      { ...removed, removals: [second.reference] },
    ],
  });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  await session.game.purchases.restore();
  await session.game.resetSave('managed-sources');
  await session.game.purchases.restore();
  expect(session.game.getSnapshot().state.tax).toMatchObject({
    status: 'exempt',
    entitlementIds: ['["apple","test.app","sandbox","managed-second"]'],
  });
  await session.game.purchases.restore();
  expect(session.game.getSnapshot().state.tax.status).toBe('exempt');
  await session.game.purchases.restore();
  expect(session.game.getSnapshot().state.tax.status).toBe('active');
  expect(await session.purchaseRecords()).toHaveLength(2);
  expect(billing.completions).toEqual([]);
});

it('recovers pending managed approval once and keeps its durable guard safe after removal', async () => {
  const pending = scriptedBilling({
    completionOwner: 'provider',
    purchases: [{ status: 'pending', productId: 'test-exemption' }],
  });
  const session = await startObservedTestGame({ billing: pending, purchasePolicy });
  expect(await session.game.purchases.purchase('test-exemption')).toEqual({
    status: 'pending',
    productId: 'test-exemption',
  });
  const approved = scriptedBilling({
    completionOwner: 'provider',
    ownership: [current, current],
    restores: [removed],
  });
  const back = await session.restart({ billing: approved });
  expect(back.game.getSnapshot().state.tax.status).toBe('exempt');
  expect(back.game.purchases.getState()).toEqual({ status: 'ready' });
  await back.game.purchases.restore();
  approved.emit({ type: 'ownershipChanged' });
  await Promise.all([back.game.purchases.recover(), back.game.purchases.recover()]);
  expect(back.game.getSnapshot().state.tax.status).toBe('active');
  expect(await back.purchaseRecords()).toMatchObject([
    { completion: 'completed', currentOwnership: { status: 'removed' } },
  ]);
  const unavailable = scriptedBilling({ completionOwner: 'provider' });
  const reopened = await back.restart({ billing: unavailable });
  expect(await reopened.game.purchases.purchase('test-exemption')).toEqual({
    status: 'unavailable',
  });
  expect(reopened.game.getSnapshot().state.tax.status).toBe('active');
  expect(unavailable.operations.filter((operation) => operation.startsWith('purchase:'))).toEqual([
    'purchase:test-exemption',
  ]);
  expect((await reopened.purchaseIdentity())?.checkout).toEqual({
    status: 'interrupted',
    productId: 'test-exemption',
  });
  expect(approved.completions).toEqual([]);
  expect(unavailable.completions).toEqual([]);
});
