import { ownership, purchasePolicy } from './purchaseTesting';
import { scriptedBilling } from './scriptedBilling';
import { startObservedTestGame } from './testGame';

const signed = { status: 'signed', ownership: [ownership] } as const;

it('delivers signed store ownership found on launch once, without a restore', async () => {
  const billing = scriptedBilling({
    completionOwner: 'application',
    ownership: [signed, signed, signed, signed],
  });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  await session.game.purchases.recover();
  expect(session.game.getSnapshot().state.tax.status).toBe('exempt');
  const state = session.game.getSnapshot().state;
  billing.emit({ type: 'ownershipChanged' });
  await session.game.purchases.recover();
  expect(session.game.getSnapshot().state).toEqual(state);
  expect(await session.purchaseRecords()).toMatchObject([
    { ownership, result: { status: 'delivered' } },
  ]);
  expect(billing.operations).not.toContain('restore');
  expect(session.game.purchases.getState()).toEqual({ status: 'ready' });
});

const purchases = (operations: readonly string[]) =>
  operations.filter((operation) => operation.startsWith('purchase:'));

it('keeps an interrupted checkout guard until signed ownership is delivered', async () => {
  const billing = scriptedBilling({
    completionOwner: 'application',
    purchases: [{ status: 'unavailable' }],
    ownership: [
      { status: 'unavailable' },
      { status: 'signed', ownership: [] },
      { status: 'signed', ownership: [] },
      signed,
    ],
  });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  expect(await session.game.purchases.purchase('test-exemption')).toEqual({
    status: 'unavailable',
  });
  expect(await session.game.purchases.purchase('test-exemption')).toEqual({
    status: 'unavailable',
  });
  expect(purchases(billing.operations)).toEqual(['purchase:test-exemption']);
  expect((await session.purchaseIdentity())?.checkout).toEqual({
    status: 'interrupted',
    productId: 'test-exemption',
  });
  billing.emit({ type: 'ownershipChanged' });
  await session.game.purchases.recover();
  expect(session.game.getSnapshot().state.tax.status).toBe('exempt');
  expect(await session.game.purchases.purchase('test-exemption')).toEqual({
    status: 'delivered',
  });
  expect(purchases(billing.operations)).toEqual(['purchase:test-exemption']);
  expect(await session.purchaseRecords()).toHaveLength(1);
});

it('never reactivates a removed purchase from signed ownership', async () => {
  const current = {
    status: 'current',
    authority: 'authoritative',
    coverage: 'complete',
    observedAtMs: 1_800_000_000_000,
    ownership: [ownership],
    removals: [],
  } as const;
  const removed = { ...current, ownership: [], removals: [ownership.reference] };
  const billing = scriptedBilling({
    completionOwner: 'application',
    restores: [current, removed],
    ownership: [{ status: 'unavailable' }, { status: 'signed', ownership: [ownership] }],
  });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  await session.game.purchases.restore();
  await session.game.purchases.restore();
  billing.emit({ type: 'ownershipChanged' });
  await session.game.purchases.recover();
  expect(billing.operations.filter((operation) => operation === 'ownership')).toHaveLength(2);
  expect(session.game.getSnapshot().state.tax.status).toBe('active');
  expect(await session.purchaseRecords()).toMatchObject([
    { ownership, currentOwnership: { status: 'removed' } },
  ]);
});

it('grants nothing from signed ownership the store did not sign', async () => {
  const provider = {
    ...ownership,
    verification: { source: 'provider', verifiedAtMs: 1_800_000_000_000 },
    completion: { owner: 'provider' },
  } as const;
  const billing = scriptedBilling({ ownership: [{ status: 'signed', ownership: [provider] }] });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  await session.game.purchases.recover();
  expect(session.game.getSnapshot().state.tax.status).toBe('notStarted');
  expect(await session.purchaseRecords()).toEqual([]);
});
