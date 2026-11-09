import { ownership, purchasePolicy } from './purchaseTesting';
import { scriptedBilling } from './scriptedBilling';
import { deferred, startObservedTestGame } from './testGame';

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

it('recovers provider-completed ownership after local failure without claiming delivery or acknowledging it', async () => {
  const billing = scriptedBilling({
    completionOwner: 'provider',
    purchases: [{ status: 'completed', ownership: managed }],
  });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  const before = session.game.getSnapshot();
  const document = session.saveDocument();
  session.faults.failWritesMatching = /INSERT INTO purchase_receipts/;
  expect(await session.game.purchases.purchase('test-exemption')).toEqual({ status: 'saveFailed' });
  expect(session.game.getSnapshot()).toEqual(before);
  expect(session.saveDocument()).toBe(document);
  expect(await session.purchaseRecords()).toEqual([]);
  expect(billing.completions).toEqual([]);
  const retry = scriptedBilling({ completionOwner: 'provider', ownership: [current] });
  const reopened = await session.restart({ billing: retry });
  expect(reopened.game.getSnapshot().state.tax.status).toBe('exempt');
  expect(await reopened.purchaseRecords()).toEqual([
    {
      ownership: managed,
      benefit: 'taxExemption',
      result: { status: 'delivered' },
      completion: 'completed',
      currentOwnership: { status: 'active', observedAtMs: current.observedAtMs },
    },
  ]);
  expect(retry.completions).toEqual([]);
});

it('recovers a provider purchase completed before the Game closes without a local delivery response', async () => {
  const response = deferred();
  const requested = deferred();
  const billing = scriptedBilling({
    completionOwner: 'provider',
    purchases: [
      response.promise.then(() => ({ status: 'completed' as const, ownership: managed })),
    ],
  });
  const session = await startObservedTestGame({
    purchasePolicy,
    billing: {
      ...billing,
      purchase: (productId) => {
        requested.resolve();
        return billing.purchase(productId);
      },
    },
  });
  const before = session.game.getSnapshot();
  const purchasing = session.game.purchases.purchase('test-exemption');
  await requested.promise;
  session.game.purchases.dispose();
  response.resolve();
  await purchasing;
  expect(session.game.getSnapshot()).toEqual(before);
  expect(await session.purchaseRecords()).toEqual([]);
  const reopened = await session.restart({
    billing: scriptedBilling({ completionOwner: 'provider', restores: [current] }),
  });
  expect(reopened.game.getSnapshot().state.tax.status).toBe('notStarted');
  expect(await reopened.game.purchases.restore()).toEqual(current);
  expect(reopened.game.getSnapshot().state.tax.status).toBe('exempt');
  expect(await reopened.purchaseRecords()).toHaveLength(1);
});

it('retries failed managed delivery on ownership events after unavailable verification', async () => {
  const billing = scriptedBilling({
    completionOwner: 'provider',
    purchases: [{ status: 'completed', ownership: managed }],
    ownership: [{ status: 'unavailable' }, { status: 'unavailable' }, current, current],
  });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  session.faults.failWritesMatching = /INSERT INTO purchase_receipts/;
  expect(await session.game.purchases.purchase('test-exemption')).toEqual({ status: 'saveFailed' });
  session.faults.failWritesMatching = undefined;
  await session.game.purchases.recover();
  expect(session.game.getSnapshot().state.tax.status).toBe('notStarted');
  billing.emit({ type: 'ownershipChanged' });
  await session.game.purchases.recover();
  expect(session.game.getSnapshot().state.tax.status).toBe('exempt');
  expect(await session.purchaseRecords()).toHaveLength(1);
  expect(billing.completions).toEqual([]);
});

it('deduplicates managed restore, purchase replays and restart even through a raw-store adapter', async () => {
  const billing = scriptedBilling({
    completionOwner: 'provider',
    restores: [current, current, { status: 'unavailable' }],
    purchases: [{ status: 'completed', ownership: managed }],
  });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  await session.game.purchases.restore();
  const before = session.game.getSnapshot().state;
  const records = await session.purchaseRecords();
  expect(await session.game.purchases.purchase('test-exemption')).toEqual({ status: 'delivered' });
  await session.game.purchases.restore();
  await session.game.purchases.restore();
  expect(session.game.getSnapshot().state).toBe(before);
  expect(await session.purchaseRecords()).toEqual(records);
  const raw = scriptedBilling({ completionOwner: 'application' });
  const reopened = await session.restart({ billing: raw });
  expect(reopened.game.getSnapshot().state.revision).toBe(before.revision);
  expect(await reopened.purchaseRecords()).toEqual(records);
  expect(raw.completions).toEqual([]);
});

it.each([
  { ...managed, verification: ownership.verification },
  { ...managed, productClass: 'consumable' },
  { ...managed, productClass: 'subscription' },
  { ...managed, completion: ownership.completion },
] as const)('rejects unsupported managed evidence %#', async (invalid) => {
  const billing = scriptedBilling({
    completionOwner: 'provider',
    purchases: [{ status: 'completed', ownership: invalid }],
  });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  const before = session.game.getSnapshot();
  expect(await session.game.purchases.purchase('test-exemption')).toEqual({
    status: 'verificationFailed',
  });
  expect(session.game.getSnapshot()).toEqual(before);
  expect(await session.purchaseRecords()).toEqual([]);
});
