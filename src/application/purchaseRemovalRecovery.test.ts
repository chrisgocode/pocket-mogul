import { ownership, purchasePolicy } from './purchaseTesting';
import { scriptedBilling } from './scriptedBilling';
import { startObservedTestGame } from './testGame';

const current = {
  status: 'current',
  authority: 'authoritative',
  coverage: 'complete',
  observedAtMs: 1_800_000_000_000,
  ownership: [ownership],
  removals: [],
} as const;
const removed = { ...current, ownership: [], removals: [ownership.reference] };

it('retains removal and delivery deduplication through reset and restart', async () => {
  const billing = scriptedBilling({ completionOwner: 'application', restores: [current, removed] });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  await session.game.purchases.restore();
  await session.game.purchases.restore();
  const records = await session.purchaseRecords();
  const identity = await session.purchaseIdentity();
  await session.game.resetSave('reset-removed');
  const back = await session.restart({
    billing: scriptedBilling({
      completionOwner: 'application',
      purchases: [{ status: 'completed', ownership }],
    }),
  });
  await back.game.purchases.purchase(ownership.reference.productId);
  expect(back.game.getSnapshot().state.tax.status).toBe('notStarted');
  expect(await back.purchaseRecords()).toEqual(records);
  expect(await back.purchaseIdentity()).toEqual(identity);
});

it('reactivates removed ownership only from a newer authoritative observation', async () => {
  const renewed = { ...current, observedAtMs: current.observedAtMs + 1_000 };
  const billing = scriptedBilling({
    completionOwner: 'application',
    restores: [current, removed, current, renewed],
  });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  await session.game.purchases.restore();
  await session.game.purchases.restore();
  await session.game.purchases.restore();
  expect(session.game.getSnapshot().state.tax.status).toBe('active');
  await session.game.purchases.restore();
  expect(session.game.getSnapshot().state.tax.status).toBe('exempt');
  expect(await session.purchaseRecords()).toMatchObject([
    { currentOwnership: { status: 'active', observedAtMs: 1_800_000_001_000 } },
  ]);
  expect(billing.completions).toEqual([ownership]);
});
