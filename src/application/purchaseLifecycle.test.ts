import { ownership, purchasePolicy } from './purchaseTesting';
import { scriptedBilling } from './scriptedBilling';
import { deferred, fakeClock, startObservedTestGame } from './testGame';

const current = {
  status: 'current',
  authority: 'authoritative',
  coverage: 'complete',
  observedAtMs: 1_800_000_000_000,
  ownership: [ownership],
  removals: [],
} as const;

it('opens free play when initialization stalls and ignores its late provider identity', async () => {
  const clock = fakeClock(1_800_000_000_000);
  const requested = deferred();
  const response = deferred();
  const billing = scriptedBilling();
  const opening = startObservedTestGame({
    clock,
    purchasePolicy,
    billing: {
      ...billing,
      initialize: () => {
        requested.resolve();
        return response.promise.then(() => ({ status: 'ready', providerReference: 'late' }));
      },
    },
  });
  await requested.promise;
  clock.advance(2_000);
  const session = await opening;
  session.game.tap();
  await session.game.flushTaps();
  expect(session.game.getSnapshot().state.cashCents).toBe(100n);
  response.resolve();
  await session.game.purchases.recover();
  expect(await session.purchaseIdentity()).not.toHaveProperty('providerReference');
});

it('opens free play when ownership stalls and ignores a late verification', async () => {
  const clock = fakeClock(1_800_000_000_000);
  const requested = deferred();
  const response = deferred();
  const billing = scriptedBilling({ completionOwner: 'application' });
  const opening = startObservedTestGame({
    clock,
    purchasePolicy,
    billing: {
      ...billing,
      currentOwnership: () => {
        requested.resolve();
        return response.promise.then(() => current);
      },
    },
  });
  await requested.promise;
  clock.advance(2_000);
  const session = await opening;
  expect(session.game.getSnapshot().state.tax.status).toBe('active');
  response.resolve();
  session.game.tap();
  await session.game.flushTaps();
  expect(await session.purchaseRecords()).toEqual([]);
});

it('owns its listener before querying inventory and cleans it up on disposal', async () => {
  const billing = scriptedBilling({ completionOwner: 'application', ownership: [current] });
  const observed: string[] = [];
  const session = await startObservedTestGame({
    purchasePolicy,
    billing: {
      ...billing,
      subscribe: (listener) => {
        const unsubscribe = billing.subscribe(listener);
        observed.push('listening');
        return () => {
          observed.push('removed');
          unsubscribe();
        };
      },
      currentOwnership: () => {
        expect(observed).toEqual(['listening']);
        return billing.currentOwnership();
      },
    },
  });
  expect(session.game.getSnapshot().state.tax.status).toBe('exempt');
  session.game.purchases.dispose();
  billing.emit({ type: 'ownershipChanged' });
  expect(observed).toEqual(['listening', 'removed']);
  expect(await session.purchaseRecords()).toHaveLength(1);
});

it('ignores ownership that arrives after disposal', async () => {
  const response = deferred();
  const billing = scriptedBilling({
    completionOwner: 'application',
    restores: [response.promise.then(() => current)],
  });
  const session = await startObservedTestGame({ billing, purchasePolicy });
  const restoring = session.game.purchases.restore();
  session.game.purchases.dispose();
  response.resolve();
  await restoring;
  expect(session.game.getSnapshot().state.tax.status).toBe('notStarted');
  expect(await session.purchaseRecords()).toEqual([]);
});
