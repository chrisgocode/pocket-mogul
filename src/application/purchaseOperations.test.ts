import { ownership, purchasePolicy } from './purchaseTesting';
import { scriptedBilling } from './scriptedBilling';
import { deferred, startObservedTestGame } from './testGame';

it('shares repeated checkout submissions while payment approval is unresolved', async () => {
  const response = deferred();
  const requested = deferred();
  const billing = scriptedBilling({
    purchases: [response.promise.then(() => ({ status: 'pending', productId: 'test-exemption' }))],
  });
  const session = await startObservedTestGame({
    purchasePolicy,
    billing: {
      ...billing,
      purchase: (id) => {
        requested.resolve();
        return billing.purchase(id);
      },
    },
  });
  const first = session.game.purchases.purchase('test-exemption');
  await requested.promise;
  const second = session.game.purchases.purchase('test-exemption');
  response.resolve();
  expect(await first).toEqual({ status: 'pending', productId: 'test-exemption' });
  expect(await second).toEqual({ status: 'pending', productId: 'test-exemption' });
  expect(billing.operations.filter((operation) => operation.startsWith('purchase:'))).toHaveLength(
    1,
  );
  expect(await session.purchaseRecords()).toEqual([]);
});

it('bounds interrupted checkout and reconciles before accepting another charge', async () => {
  const requested = deferred();
  const response = deferred();
  const billing = scriptedBilling({
    completionOwner: 'application',
    purchases: [response.promise.then(() => ({ status: 'completed', ownership }))],
    ownership: [{ status: 'unavailable' }, { status: 'unavailable' }],
  });
  const session = await startObservedTestGame({
    purchasePolicy,
    billing: {
      ...billing,
      purchase: (id) => {
        requested.resolve();
        return billing.purchase(id);
      },
    },
  });
  const purchasing = session.game.purchases.purchase('test-exemption');
  await requested.promise;
  session.clock.advance(2_000);
  expect(session.game.purchases.getState()).toEqual({
    status: 'purchasing',
    productId: 'test-exemption',
  });
  session.clock.advance(298_000);
  expect(await purchasing).toEqual({ status: 'unavailable' });
  expect(session.game.purchases.getState()).toEqual({
    status: 'interrupted',
    productId: 'test-exemption',
  });
  expect(await session.game.purchases.purchase('test-exemption')).toEqual({
    status: 'unavailable',
  });
  expect(billing.operations.filter((operation) => operation.startsWith('purchase:'))).toHaveLength(
    1,
  );
  response.resolve();
  session.game.tap();
  await session.game.flushTaps();
  expect(session.game.getSnapshot().state.cashCents).toBe(100n);
  expect(await session.purchaseRecords()).toEqual([]);
});

it('recovers pending approval after restart and never acknowledges the pending payment', async () => {
  const billing = scriptedBilling({
    completionOwner: 'application',
    purchases: [{ status: 'pending', productId: 'test-exemption' }],
  });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  await session.game.purchases.purchase('test-exemption');
  expect(session.game.purchases.getState()).toEqual({
    status: 'pending',
    productId: 'test-exemption',
  });
  expect(billing.completions).toEqual([]);
  expect(await session.purchaseRecords()).toEqual([]);
  const approved = scriptedBilling({
    completionOwner: 'application',
    ownership: [current, current],
  });
  const reopened = await session.restart({ billing: approved });
  await reopened.game.purchases.recover();
  expect(reopened.game.getSnapshot().state.tax.status).toBe('exempt');
  expect(await reopened.purchaseRecords()).toHaveLength(1);
  expect(approved.completions).toEqual([ownership]);
});

const current = {
  status: 'current',
  authority: 'authoritative',
  coverage: 'complete',
  observedAtMs: 1_800_000_000_000,
  ownership: [ownership],
  removals: [],
} as const;

it('reconciles an unknown result immediately without charging again after a failed delivery', async () => {
  const billing = scriptedBilling({
    completionOwner: 'application',
    purchases: [{ status: 'unavailable' }, { status: 'completed', ownership }],
    ownership: [{ status: 'unavailable' }, current, current],
  });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  session.faults.failWritesMatching = /INSERT INTO purchase_receipts/;
  expect(await session.game.purchases.purchase('test-exemption')).toEqual({
    status: 'unavailable',
  });
  expect(await session.purchaseRecords()).toEqual([]);
  expect(await session.game.purchases.purchase('test-exemption')).toEqual({ status: 'saveFailed' });
  expect(billing.operations.filter((operation) => operation.startsWith('purchase:'))).toHaveLength(
    1,
  );
});

it('does not grant a pending payment cancelled while the Game is closed', async () => {
  const billing = scriptedBilling({
    completionOwner: 'application',
    purchases: [{ status: 'pending', productId: 'test-exemption' }],
  });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  await session.game.purchases.purchase('test-exemption');
  const cancelled = scriptedBilling({
    completionOwner: 'application',
    ownership: [{ ...current, ownership: [] }],
  });
  const reopened = await session.restart({ billing: cancelled });
  expect(reopened.game.getSnapshot().state.tax.status).toBe('notStarted');
  expect(await reopened.purchaseRecords()).toEqual([]);
  expect(cancelled.completions).toEqual([]);
});

it('makes disposal idempotent and rejects new operations without provider work', async () => {
  const billing = scriptedBilling({ completionOwner: 'application' });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  const operations = [...billing.operations];
  session.game.purchases.dispose();
  session.game.purchases.dispose();
  billing.emit({ type: 'ownershipChanged' });
  await session.game.purchases.recover();
  expect(await session.game.purchases.purchase('test-exemption')).toEqual({
    status: 'unavailable',
  });
  expect(await session.game.purchases.restore()).toEqual({ status: 'unavailable' });
  expect(await session.game.purchases.products()).toEqual({ status: 'unavailable', products: [] });
  expect(session.game.purchases.getState()).toEqual({ status: 'disposed' });
  expect(billing.operations).toEqual(operations);
});

it('retains an unresolved checkout across restart when verification is unavailable', async () => {
  const billing = scriptedBilling({
    purchases: [{ status: 'pending', productId: 'test-exemption' }],
  });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  await session.game.purchases.purchase('test-exemption');
  const unavailable = scriptedBilling({ purchases: [{ status: 'completed', ownership }] });
  const reopened = await session.restart({ billing: unavailable });
  expect(await reopened.game.purchases.purchase('test-exemption')).toEqual({
    status: 'unavailable',
  });
  expect(unavailable.operations.filter((operation) => operation.startsWith('purchase:'))).toEqual(
    [],
  );
  expect(await reopened.purchaseRecords()).toEqual([]);
});
