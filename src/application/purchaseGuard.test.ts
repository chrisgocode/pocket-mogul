import { ownership, purchasePolicy } from './purchaseTesting';
import { scriptedBilling } from './scriptedBilling';
import { deferred, startObservedTestGame } from './testGame';

it('reports guard read failure without rejecting recovery or starting another charge', async () => {
  const billing = scriptedBilling();
  const session = await startObservedTestGame({ billing, purchasePolicy });
  session.readFaults.failReads = true;
  await expect(session.game.purchases.recover()).resolves.toBeUndefined();
  expect(session.game.purchases.getState()).toEqual({ status: 'failed', reason: 'saveFailed' });
  expect(await session.game.purchases.purchase('test-exemption')).toEqual({ status: 'saveFailed' });
  expect(billing.operations.filter((operation) => operation.startsWith('purchase:'))).toEqual([]);
  session.readFaults.failReads = false;
  session.game.tap();
  await session.game.flushTaps();
  expect(session.game.getSnapshot().state.cashCents).toBe(100n);
});

it('does not start checkout if its unresolved-operation guard cannot be saved', async () => {
  const billing = scriptedBilling({ purchases: [{ status: 'completed', ownership }] });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  session.faults.failWritesMatching = /INSERT INTO purchase_identity/;
  expect(await session.game.purchases.purchase('test-exemption')).toEqual({ status: 'saveFailed' });
  expect(billing.operations.filter((operation) => operation.startsWith('purchase:'))).toEqual([]);
  expect(await session.purchaseRecords()).toEqual([]);
});

it('retains the pre-checkout guard when the Game closes before the provider responds', async () => {
  const requested = deferred();
  const response = deferred();
  const billing = scriptedBilling();
  const session = await startObservedTestGame({
    purchasePolicy,
    billing: {
      ...billing,
      purchase: () => {
        requested.resolve();
        return response.promise.then(() => ({ status: 'completed', ownership }));
      },
    },
  });
  const purchasing = session.game.purchases.purchase('test-exemption');
  await requested.promise;
  const unavailable = scriptedBilling();
  const reopened = await session.restart({ billing: unavailable });
  expect(await reopened.game.purchases.purchase('test-exemption')).toEqual({
    status: 'unavailable',
  });
  expect(unavailable.operations.filter((operation) => operation.startsWith('purchase:'))).toEqual(
    [],
  );
  response.resolve();
  expect(await purchasing).toEqual({ status: 'unavailable' });
  expect(await reopened.purchaseRecords()).toEqual([]);
});

it('permits an explicit retry only after authoritative inventory excludes ownership and pending payment', async () => {
  const absent = {
    status: 'current',
    authority: 'authoritative',
    coverage: 'complete',
    observedAtMs: 1_800_000_000_000,
    ownership: [],
    removals: [],
    pendingProductIds: [],
  } as const;
  const billing = scriptedBilling({
    purchases: [{ status: 'pending', productId: 'test-exemption' }, { status: 'cancelled' }],
  });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  await session.game.purchases.purchase('test-exemption');
  const cancelled = scriptedBilling({ ownership: [absent], purchases: [{ status: 'cancelled' }] });
  const reopened = await session.restart({ billing: cancelled });
  expect(await reopened.game.purchases.purchase('test-exemption')).toEqual({ status: 'cancelled' });
  expect(reopened.game.purchases.getState()).toEqual({ status: 'ready' });
  expect(await reopened.purchaseRecords()).toEqual([]);
});

it('retains an interrupted checkout guard when absence predates the ownership request', async () => {
  const absent = {
    status: 'current',
    authority: 'authoritative',
    coverage: 'complete',
    observedAtMs: 1_800_000_000_000,
    ownership: [],
    removals: [],
    pendingProductIds: [],
  } as const;
  const billing = scriptedBilling({
    ownership: [{ status: 'unavailable' }, absent, absent],
    purchases: [{ status: 'unavailable' }, { status: 'cancelled' }],
  });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  session.clock.advance(1_000);
  expect(await session.game.purchases.purchase('test-exemption')).toEqual({
    status: 'unavailable',
  });
  expect(session.game.purchases.getState()).toEqual({
    status: 'interrupted',
    productId: 'test-exemption',
  });
  expect((await session.purchaseIdentity())?.checkout).toBeDefined();
  expect(await session.game.purchases.purchase('test-exemption')).toEqual({
    status: 'unavailable',
  });
  expect(billing.operations.filter((operation) => operation.startsWith('purchase:'))).toHaveLength(
    1,
  );
});

it.each([
  { policy: purchasePolicy, cleared: false },
  {
    policy: {
      ...purchasePolicy,
      products: [{ ...purchasePolicy.products[0], duplicateCharge: 'storePrevents' }],
    },
    cleared: true,
  },
] as const)(
  'clears a guard without a pending list only for store-protected products %#',
  async ({ policy, cleared }) => {
    const absent = {
      status: 'current',
      authority: 'authoritative',
      coverage: 'complete',
      observedAtMs: 1_800_000_000_000,
      ownership: [],
      removals: [],
    } as const;
    const billing = scriptedBilling({
      purchases: [{ status: 'pending', productId: 'test-exemption' }],
    });
    const session = await startObservedTestGame({ billing, purchasePolicy: policy });
    await session.game.purchases.purchase('test-exemption');
    const reopened = await session.restart({
      billing: scriptedBilling({ ownership: [absent], restores: [absent] }),
      purchasePolicy: policy,
    });
    await reopened.game.purchases.restore();
    expect((await reopened.purchaseIdentity())?.checkout === undefined).toBe(cleared);
  },
);

it('keeps a store-protected guard when its absence was observed before the restore request', async () => {
  const policy = {
    ...purchasePolicy,
    products: [{ ...purchasePolicy.products[0], duplicateCharge: 'storePrevents' }],
  } as const;
  const stale = {
    status: 'current',
    authority: 'authoritative',
    coverage: 'complete',
    observedAtMs: 1_800_000_000_000,
    ownership: [],
    removals: [],
  } as const;
  const billing = scriptedBilling({
    purchases: [{ status: 'pending', productId: 'test-exemption' }],
  });
  const session = await startObservedTestGame({ billing, purchasePolicy: policy });
  await session.game.purchases.purchase('test-exemption');
  session.clock.advance(1_000);
  const reopened = await session.restart({
    billing: scriptedBilling({ ownership: [stale], restores: [stale] }),
    purchasePolicy: policy,
  });
  await reopened.game.purchases.restore();
  expect((await reopened.purchaseIdentity())?.checkout).toBeDefined();
});

it('keeps a store-protected guard while fresh evidence lists its payment as pending', async () => {
  const policy = {
    ...purchasePolicy,
    products: [{ ...purchasePolicy.products[0], duplicateCharge: 'storePrevents' }],
  } as const;
  const pending = {
    status: 'current',
    authority: 'authoritative',
    coverage: 'complete',
    observedAtMs: 1_800_000_000_000,
    ownership: [],
    removals: [],
    pendingProductIds: ['test-exemption'],
  } as const;
  const billing = scriptedBilling({
    purchases: [{ status: 'pending', productId: 'test-exemption' }],
  });
  const session = await startObservedTestGame({ billing, purchasePolicy: policy });
  await session.game.purchases.purchase('test-exemption');
  const reopened = await session.restart({
    billing: scriptedBilling({ ownership: [pending], restores: [pending] }),
    purchasePolicy: policy,
  });
  await reopened.game.purchases.restore();
  expect((await reopened.purchaseIdentity())?.checkout).toEqual({
    status: 'pending',
    productId: 'test-exemption',
  });
});
