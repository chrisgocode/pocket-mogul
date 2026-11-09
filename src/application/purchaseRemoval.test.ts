import { ownership, purchasePolicy } from './purchaseTesting';
import { scriptedBilling } from './scriptedBilling';
import { deferred, startObservedTestGame } from './testGame';
import type { VerifiedTaxEntitlement } from '@/domain/tax/exemption';

const current = {
  status: 'current',
  authority: 'authoritative',
  coverage: 'complete',
  observedAtMs: 1_800_000_000_000,
  ownership: [ownership],
  removals: [],
} as const;
const removed = { ...current, ownership: [], removals: [ownership.reference] };

it('atomically removes the granted identity and retains removal across restart and stale callbacks', async () => {
  const billing = scriptedBilling({ completionOwner: 'application', restores: [current, removed] });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  await session.game.purchases.restore();
  await session.game.purchases.restore();
  expect(session.game.getSnapshot().state.tax.status).toBe('active');
  expect(await session.purchaseRecords()).toMatchObject([
    { currentOwnership: { status: 'removed' } },
  ]);
  const back = await session.restart({
    billing: scriptedBilling({
      completionOwner: 'application',
      ownership: [{ status: 'unavailable' }],
      restores: [removed],
      purchases: [{ status: 'completed', ownership }],
    }),
  });
  await back.game.purchases.purchase(ownership.reference.productId);
  await back.game.purchases.restore();
  expect(back.game.getSnapshot().state.tax.status).toBe('active');
  expect(await back.purchaseRecords()).toHaveLength(1);
});

it.each([
  { ...removed, authority: 'cached' },
  { ...removed, coverage: 'incomplete' },
  { ...removed, observedAtMs: 1 },
  { ...removed, observedAtMs: Number.NaN },
  { ...removed, removals: [] },
  { status: 'unavailable' },
  { status: 'verificationFailed' },
] as const)('preserves verified access when removal cannot be established %#', async (evidence) => {
  const billing = scriptedBilling({
    completionOwner: 'application',
    restores: [current, evidence],
  });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  await session.game.purchases.restore();
  const before = session.game.getSnapshot().state;
  await session.game.purchases.restore();
  expect(session.game.getSnapshot().state).toBe(before);
  expect(await session.purchaseRecords()).toMatchObject([
    { currentOwnership: { status: 'active' } },
  ]);
});

it('keeps another verified purchase source through removal', async () => {
  const second = {
    ...ownership,
    reference: { ...ownership.reference, purchaseId: 'transaction-2' },
  };
  const billing = scriptedBilling({
    completionOwner: 'application',
    restores: [
      { ...current, ownership: [ownership, second] },
      removed,
      { ...removed, removals: [second.reference] },
    ],
  });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  await session.game.purchases.restore();
  await session.game.purchases.restore();
  expect(session.game.getSnapshot().state.tax).toMatchObject({
    status: 'exempt',
    entitlementIds: ['["apple","test.app","sandbox","transaction-2"]'],
  });
  await session.game.purchases.restore();
  expect(session.game.getSnapshot().state.tax.status).toBe('active');
});

it.each([/INSERT INTO purchase_receipts/, /INSERT INTO save_state/])(
  'publishes no partial removal when write %s fails and retries safely',
  async (failure) => {
    const billing = scriptedBilling({
      completionOwner: 'application',
      restores: [current, removed, removed, removed],
    });
    const session = await startObservedTestGame({ billing, purchasePolicy });
    await session.game.purchases.restore();
    const before = session.game.getSnapshot().state;
    session.faults.failWritesMatching = failure;
    expect(await session.game.purchases.restore()).toEqual({ status: 'saveFailed' });
    expect(session.game.getSnapshot().state).toBe(before);
    expect(await session.purchaseRecords()).toMatchObject([
      { currentOwnership: { status: 'active' } },
    ]);
    session.faults.failWritesMatching = undefined;
    await session.game.purchases.restore();
    const after = session.game.getSnapshot().state;
    await session.game.purchases.restore();
    expect(session.game.getSnapshot().state).toBe(after);
    expect(after.tax.status).toBe('active');
  },
);

it.each([
  { ...ownership.reference, store: 'google' },
  { ...ownership.reference, environment: 'production' },
  { ...ownership.reference, appId: 'other.app' },
  { ...ownership.reference, productId: 'other-product' },
] as const)('rejects removal outside the granted scope or product %#', async (reference) => {
  const billing = scriptedBilling({
    completionOwner: 'application',
    restores: [current, { ...removed, removals: [reference] }],
  });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  await session.game.purchases.restore();
  await session.game.purchases.restore();
  expect(session.game.getSnapshot().state.tax.status).toBe('exempt');
  expect(await session.purchaseRecords()).toMatchObject([
    { currentOwnership: { status: 'active' } },
  ]);
});

it('ignores a delayed query after newer removal and treats repeated callbacks as reconciliation triggers', async () => {
  const response = deferred();
  const requested = deferred();
  const newerRemoval = { ...removed, observedAtMs: current.observedAtMs + 2_000 };
  const billing = scriptedBilling({
    completionOwner: 'application',
    ownership: [
      { status: 'unavailable' },
      response.promise.then(() => current),
      { status: 'unavailable' },
    ],
    restores: [current, newerRemoval, current],
  });
  const signals = [() => undefined, () => requested.resolve()];
  const session = await startObservedTestGame({
    billing: {
      ...billing,
      currentOwnership: () => {
        const result = billing.currentOwnership();
        signals.shift()?.();
        return result;
      },
    },
    purchasePolicy,
  });
  await session.game.purchases.restore();
  billing.emit({ type: 'ownershipChanged' });
  await requested.promise;
  session.clock.advance(2_000);
  const restoring = session.game.purchases.restore();
  await restoring;
  response.resolve();
  await session.game.purchases.restore();
  billing.emit({ type: 'ownershipChanged' });
  await session.game.purchases.recover();
  expect(session.game.getSnapshot().state.tax.status).toBe('active');
  expect(await session.purchaseRecords()).toMatchObject([
    { currentOwnership: { status: 'removed', observedAtMs: 1_800_000_002_000 } },
  ]);
});

it('rejects an older removal after newer authoritative ownership', async () => {
  const newerOwnership = { ...current, observedAtMs: current.observedAtMs + 2_000 };
  const olderRemoval = { ...removed, observedAtMs: current.observedAtMs + 1_000 };
  const billing = scriptedBilling({
    completionOwner: 'application',
    restores: [newerOwnership, olderRemoval],
  });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  await session.game.purchases.restore();
  const state = session.game.getSnapshot().state;
  await session.game.purchases.restore();
  expect(session.game.getSnapshot().state).toBe(state);
  expect(state.tax.status).toBe('exempt');
  expect(await session.purchaseRecords()).toMatchObject([
    { currentOwnership: { status: 'active', observedAtMs: 1_800_000_002_000 } },
  ]);
});

it('rejects inventory grants with a completion owner inconsistent with the adapter', async () => {
  const billing = scriptedBilling({ restores: [current] });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  await session.game.purchases.restore();
  expect(session.game.getSnapshot().state.tax.status).toBe('notStarted');
  expect(await session.purchaseRecords()).toEqual([]);
});

it('preserves access from the legacy entitlement while removing a purchase source', async () => {
  const billing = scriptedBilling({ completionOwner: 'application', restores: [current, removed] });
  const session = await startObservedTestGame({
    billing,
    purchasePolicy,
    taxEntitlement: {
      current: () => Promise.resolve({ status: 'verified', transactionId: 'legacy' }),
    },
  });
  await session.game.purchases.restore();
  await session.game.purchases.restore();
  expect(session.game.getSnapshot().state.tax).toMatchObject({
    status: 'exempt',
    entitlementIds: ['legacy'],
  });
  const back = await session.restart({
    billing: scriptedBilling(),
    taxEntitlement: {
      current: () => Promise.resolve({ status: 'revoked', transactionId: 'legacy' }),
    },
  });
  expect(back.game.getSnapshot().state.tax.status).toBe('active');
});

it('preserves every verified source through reset before removing one source', async () => {
  const billing = scriptedBilling({ completionOwner: 'application', restores: [current, removed] });
  let entitlement: VerifiedTaxEntitlement = { status: 'verified', transactionId: 'legacy' };
  const session = await startObservedTestGame({
    billing,
    purchasePolicy,
    taxEntitlement: {
      current: () => Promise.resolve(entitlement),
    },
  });
  await session.game.purchases.restore();
  entitlement = { status: 'unavailable' };
  await session.game.resetSave('reset-multiple-sources');
  await session.game.purchases.restore();
  expect(session.game.getSnapshot().state.tax).toMatchObject({
    status: 'exempt',
    entitlementIds: ['legacy'],
  });
});
