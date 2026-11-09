import { getContent } from '@/content';
import { freshGameState } from '@/domain/gameState';
import { ownedBusiness } from '@/domain/testRules';
import type { TelemetryEvent } from './telemetry';
import { ownership, purchasePolicy } from './purchaseTesting';
import { scriptedBilling } from './scriptedBilling';
import { deferred, startObservedTestGame, startTestGameFrom, withoutIncidents } from './testGame';

const current = {
  status: 'current',
  authority: 'authoritative',
  coverage: 'complete',
  observedAtMs: 1_800_000_000_000,
  ownership: [ownership],
  removals: [],
} as const;

it('serializes restore and checkout while coalescing a burst of recovery requests', async () => {
  const response = deferred();
  const requested = deferred();
  const billing = scriptedBilling({
    completionOwner: 'application',
    restores: [response.promise.then(() => current)],
    purchases: [{ status: 'completed', ownership }],
    ownership: [{ status: 'unavailable' }, current],
  });
  const session = await startObservedTestGame({
    purchasePolicy,
    billing: {
      ...billing,
      restore: () => {
        requested.resolve();
        return billing.restore();
      },
    },
  });
  const restoring = session.game.purchases.restore();
  await requested.promise;
  const duplicateRestore = session.game.purchases.restore();
  const purchasing = session.game.purchases.purchase('test-exemption');
  const recovery = session.game.purchases.recover();
  billing.emit({ type: 'ownershipChanged' });
  const duplicateRecovery = session.game.purchases.recover();
  response.resolve();
  await Promise.all([restoring, duplicateRestore, purchasing, recovery, duplicateRecovery]);
  expect(await session.purchaseRecords()).toHaveLength(1);
  expect(billing.completions).toEqual([ownership]);
  expect(billing.operations.filter((operation) => operation === 'restore')).toHaveLength(1);
  expect(billing.operations.filter((operation) => operation === 'ownership')).toHaveLength(2);
});

it('redacts credential-bearing provider failures through existing telemetry', async () => {
  const events: TelemetryEvent[] = [];
  const billing = scriptedBilling();
  const session = await startObservedTestGame({
    purchasePolicy,
    telemetry: {
      record: (event) => {
        events.push(event);
      },
    },
    billing: {
      ...billing,
      purchase: () => Promise.reject(new Error('token=secret receipt=private customer=person')),
    },
  });
  expect(await session.game.purchases.purchase('test-exemption')).toEqual({
    status: 'unavailable',
  });
  const diagnostics = events.filter((event) => event.name === 'purchase_operation');
  expect(diagnostics).toContainEqual(
    expect.objectContaining({
      details: {
        operation: 'interrupted',
        outcome: 'interrupted',
        store: 'apple',
        environment: 'sandbox',
      },
    }),
  );
  expect(JSON.stringify(events)).not.toMatch(
    /secret|private|person|test-exemption|transaction-1|token=|receipt=/,
  );
  expect(events.map((event) => event.name)).not.toContain('save_failed');
});

it('recovers a dropped approval callback through rapid foregrounds with one delivery and settlement', async () => {
  const response = deferred();
  const events: TelemetryEvent[] = [];
  const billing = scriptedBilling({
    completionOwner: 'application',
    purchases: [{ status: 'pending', productId: 'test-exemption' }],
    ownership: [
      { status: 'unavailable' },
      response.promise.then(() => ({ ...current, observedAtMs: 1_800_000_060_000 })),
    ],
  });
  const session = await startTestGameFrom(
    {
      ...freshGameState({
        saveId: 'foreground',
        economyVersion: getContent().economyVersion,
        wallMs: 1_800_000_000_000,
      }),
      businesses: [ownedBusiness('vending')],
    },
    {
      purchasePolicy,
      content: withoutIncidents(getContent()),
      telemetry: {
        record: (event) => {
          events.push(event);
        },
      },
      billing,
    },
  );
  await session.game.purchases.purchase('test-exemption');
  await session.game.pause();
  session.clock.advance(60_000);
  const resumes = [session.game.resume(), session.game.resume(), session.game.resume()];
  response.resolve();
  await Promise.all(resumes);
  expect(session.game.getSnapshot().state.tax.status).toBe('exempt');
  expect(await session.purchaseRecords()).toHaveLength(1);
  expect(billing.completions).toEqual([ownership]);
  expect(billing.operations.filter((operation) => operation === 'ownership')).toHaveLength(2);
  expect(events.filter((event) => event.name === 'offline_settled')).toHaveLength(1);
});

it('drains removal events received during an ownership query before recovery resolves', async () => {
  const requested = deferred();
  const response = deferred();
  const requests = [deferred(), requested];
  const billing = scriptedBilling({
    completionOwner: 'application',
    ownership: [
      { status: 'unavailable' },
      response.promise.then(() => current),
      {
        ...current,
        ownership: [],
        removals: [ownership.reference],
      },
    ],
  });
  const session = await startObservedTestGame({
    purchasePolicy,
    billing: {
      ...billing,
      currentOwnership: () => {
        const result = billing.currentOwnership();
        requests.shift()?.resolve();
        return result;
      },
    },
  });
  const recovering = session.game.purchases.recover();
  await requested.promise;
  billing.emit({ type: 'ownershipChanged' });
  response.resolve();
  await recovering;
  expect(session.game.getSnapshot().state.tax.status).toBe('active');
  expect(await session.purchaseRecords()).toMatchObject([
    { currentOwnership: { status: 'removed' } },
  ]);
  expect(billing.operations.filter((operation) => operation === 'ownership')).toHaveLength(3);
  session.game.purchases.dispose();
  billing.emit({ type: 'ownershipChanged' });
  await session.game.purchases.recover();
  expect(billing.operations.filter((operation) => operation === 'ownership')).toHaveLength(3);
});

it('drains approval events arriving during pending reconciliation before recovery resolves', async () => {
  const requested = deferred();
  const response = deferred();
  const requests = [deferred(), requested];
  const billing = scriptedBilling({
    completionOwner: 'application',
    purchases: [{ status: 'pending', productId: 'test-exemption' }],
    ownership: [
      { status: 'unavailable' },
      response.promise.then(() => ({
        ...current,
        ownership: [],
        pendingProductIds: ['test-exemption'],
      })),
      current,
    ],
  });
  const session = await startObservedTestGame({
    purchasePolicy,
    billing: {
      ...billing,
      currentOwnership: () => {
        const result = billing.currentOwnership();
        requests.shift()?.resolve();
        return result;
      },
    },
  });
  await session.game.purchases.purchase('test-exemption');
  const recovering = session.game.purchases.recover();
  const duplicate = session.game.purchases.recover();
  await requested.promise;
  billing.emit({ type: 'ownershipChanged' });
  billing.emit({ type: 'ownershipChanged' });
  response.resolve();
  await Promise.all([recovering, duplicate]);
  expect(session.game.getSnapshot().state.tax.status).toBe('exempt');
  expect(session.game.purchases.getState()).toEqual({ status: 'ready' });
  expect(await session.purchaseRecords()).toHaveLength(1);
  expect(billing.completions).toEqual([ownership]);
  expect(billing.operations.filter((operation) => operation === 'ownership')).toHaveLength(3);
});
