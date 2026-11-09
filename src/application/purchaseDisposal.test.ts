import { purchaseKey } from './purchaseLedger';
import { ownership, purchasePolicy } from './purchaseTesting';
import { scriptedBilling } from './scriptedBilling';
import { deferred, startObservedTestGame } from './testGame';

it('does not deliver ownership queued behind a held save after disposal', async () => {
  const requested = deferred();
  const response = deferred();
  const billing = scriptedBilling({
    completionOwner: 'application',
    purchases: [{ status: 'completed', ownership }],
  });
  const session = await startObservedTestGame({
    purchasePolicy,
    billing: {
      ...billing,
      purchase: (productId) => {
        requested.resolve();
        return response.promise.then(() => billing.purchase(productId));
      },
    },
  });
  const purchasing = session.game.purchases.purchase('test-exemption');
  await requested.promise;
  const release = session.holdSaves();
  const saving = session.game.dispatch({ id: 'held', command: { type: 'AdvanceTime' } });
  response.resolve();
  await Promise.resolve();
  session.game.purchases.dispose();
  release();
  await saving;
  await purchasing;
  expect(session.game.getSnapshot().state.tax.status).toBe('active');
  expect(await session.purchaseRecords()).toEqual([]);
  expect(billing.completions).toEqual([]);
});

it('does not restore cached ownership queued behind a held save after disposal', async () => {
  const billing = scriptedBilling({
    completionOwner: 'application',
    purchases: [{ status: 'completed', ownership }],
  });
  const session = await startObservedTestGame({
    billing,
    purchasePolicy,
    taxEntitlement: {
      current: () =>
        Promise.resolve({ status: 'revoked', transactionId: purchaseKey(ownership.reference) }),
    },
  });
  await session.game.purchases.purchase('test-exemption');
  await session.game.restoreTaxExemption();
  const release = session.holdSaves();
  const saving = session.game.dispatch({ id: 'held-cached', command: { type: 'AdvanceTime' } });
  const recovering = session.game.purchases.recover();
  await Promise.resolve();
  session.game.purchases.dispose();
  release();
  await saving;
  await recovering;
  expect(session.game.getSnapshot().state.tax.status).toBe('active');
  expect(await session.purchaseRecords()).toHaveLength(1);
});

it('retains pending completion when its marker is queued behind a held save at disposal', async () => {
  const completed = deferred();
  const response = deferred();
  const billing = scriptedBilling({
    completionOwner: 'application',
    purchases: [{ status: 'completed', ownership }],
  });
  const session = await startObservedTestGame({
    purchasePolicy,
    billing: {
      ...billing,
      completion: {
        owner: 'application',
        complete: () => {
          completed.resolve();
          return response.promise.then(() => ({ status: 'completed' as const }));
        },
      },
    },
  });
  const purchasing = session.game.purchases.purchase('test-exemption');
  await completed.promise;
  const release = session.holdSaves();
  const saving = session.game.dispatch({ id: 'held-marker', command: { type: 'AdvanceTime' } });
  response.resolve();
  await Array.from({ length: 12 }).reduce<Promise<void>>(async (previous) => {
    await previous;
  }, Promise.resolve());
  session.game.purchases.dispose();
  release();
  await saving;
  await purchasing;
  expect(await session.purchaseRecords()).toMatchObject([{ completion: 'pending' }]);
  expect(session.game.getSnapshot().state.tax.status).toBe('exempt');
});

it('does not write a delivery whose transaction waits for storage until after disposal', async () => {
  const requested = deferred();
  const response = deferred();
  const billing = scriptedBilling({ completionOwner: 'application' });
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
  const before = session.game.getSnapshot().state;
  const purchasing = session.game.purchases.purchase('test-exemption');
  await requested.promise;
  const release = session.holdSaves();
  response.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  session.game.purchases.dispose();
  release();
  await purchasing;
  expect(session.game.getSnapshot().state).toBe(before);
  expect(await session.purchaseRecords()).toEqual([]);
  expect(billing.completions).toEqual([]);
});
