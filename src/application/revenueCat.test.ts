import { revenueCatBilling } from '@/infrastructure/revenueCatBilling';
import { revenueCatRuntime } from '@/infrastructure/revenueCatRuntime';
import { revenueCatFake, validationConfig } from '@/infrastructure/revenueCatTesting';
import { deferred, fakeClock, startObservedTestGame } from './testGame';

it('reads localized products through Game without inventing ownership or enabling checkout', async () => {
  const sdk = revenueCatFake();
  const selected = revenueCatBilling({
    config: validationConfig,
    platform: 'ios',
    runtime: revenueCatRuntime(() => Promise.resolve(sdk)),
  });
  const session = await startObservedTestGame(selected);
  expect(await session.game.purchases.products()).toEqual({
    status: 'available',
    products: [
      { productId: 'pm_validation_exemption', displayName: 'Exonération', displayPrice: '1,99 €' },
    ],
  });
  expect(await session.game.purchases.restore()).toEqual({ status: 'unavailable' });
  expect(await session.game.purchases.purchase('pm_validation_exemption')).toEqual({
    status: 'disabled',
  });
  expect(await session.purchaseRecords()).toEqual([]);
  expect(await session.purchaseIdentity()).toHaveProperty(
    'providerReference',
    '$RCAnonymousID:test',
  );
  session.game.tap();
  await session.game.flushTaps();
  expect(session.game.getSnapshot().state.cashCents).toBe(100n);
});

it.each([
  undefined,
  {},
  { ...validationConfig, environment: 'production' },
  { ...validationConfig, apiKey: 'goog_wrong' },
  { ...validationConfig, productId: 'commercial' },
])('keeps invalid validation configuration disabled without loading the SDK %#', async (config) => {
  const sdk = revenueCatFake();
  const loaded: string[] = [];
  const selected = revenueCatBilling({
    config,
    platform: 'ios',
    runtime: revenueCatRuntime(() => {
      loaded.push('loaded');
      return Promise.resolve(sdk);
    }),
  });
  const session = await startObservedTestGame(selected);
  expect(await session.game.purchases.products()).toEqual({ status: 'disabled', products: [] });
  expect(await session.game.purchases.restore()).toEqual({ status: 'disabled' });
  expect(loaded).toEqual([]);
  expect(await session.purchaseIdentity()).toBeUndefined();
});

it('shares native configuration across Game lifetimes and removes each Game subscription', async () => {
  const sdk = revenueCatFake();
  const runtime = revenueCatRuntime(() => Promise.resolve(sdk));
  const select = () => revenueCatBilling({ config: validationConfig, platform: 'ios', runtime });
  const session = await startObservedTestGame(select());
  expect(sdk.listeners.size).toBe(1);
  const reopened = await session.restart(select());
  expect(sdk.configurations).toEqual(['appl_validation']);
  expect(sdk.listeners.size).toBe(1);
  expect(await reopened.purchaseIdentity()).toEqual(await session.purchaseIdentity());
  reopened.game.purchases.dispose();
  sdk.emit();
  await Promise.resolve();
  expect(sdk.listeners.size).toBe(0);
  expect(await reopened.purchaseRecords()).toEqual([]);
});

it('bounds a stalled native load and keeps free play usable after the late result', async () => {
  const clock = fakeClock(1_800_000_000_000);
  const requested = deferred();
  const response = deferred();
  const sdk = revenueCatFake();
  const selected = revenueCatBilling({
    config: validationConfig,
    platform: 'ios',
    runtime: revenueCatRuntime(() => {
      requested.resolve();
      return response.promise.then(() => sdk);
    }),
  });
  const queried = deferred();
  const opening = startObservedTestGame({
    ...selected,
    clock,
    billing: {
      ...selected.billing,
      currentOwnership: () => {
        queried.resolve();
        return selected.billing.currentOwnership();
      },
    },
  });
  await requested.promise;
  clock.advance(2_000);
  await queried.promise;
  clock.advance(2_000);
  const session = await opening;
  session.game.tap();
  await session.game.flushTaps();
  expect(session.game.getSnapshot().state.cashCents).toBe(100n);
  session.game.purchases.dispose();
  response.resolve();
  await Promise.resolve();
  expect(await session.purchaseRecords()).toEqual([]);
  expect(await session.purchaseIdentity()).not.toHaveProperty('providerReference');
  expect(sdk.listeners.size).toBe(0);
});

it.each(['web', 'windows', 'android'])(
  'disables an unsupported platform or mismatched store %s',
  async (platform) => {
    const loaded: string[] = [];
    const selected = revenueCatBilling({
      config: validationConfig,
      platform,
      runtime: () => {
        loaded.push('loaded');
        return Promise.reject(new Error('unexpected SDK load'));
      },
    });
    const session = await startObservedTestGame(selected);
    expect(await session.game.purchases.products()).toEqual({ status: 'disabled', products: [] });
    expect(loaded).toEqual([]);
  },
);

it('rejects a conflicting process configuration and mismatched persisted provider identity', async () => {
  const sdk = revenueCatFake();
  const runtime = revenueCatRuntime(() => Promise.resolve(sdk));
  const select = () => revenueCatBilling({ config: validationConfig, platform: 'ios', runtime });
  const session = await startObservedTestGame(select());
  const identity = await session.purchaseIdentity();
  const mismatched = revenueCatBilling({
    config: validationConfig,
    platform: 'ios',
    runtime: revenueCatRuntime(() =>
      Promise.resolve({
        ...revenueCatFake(),
        getAppUserID: () => Promise.resolve('$RCAnonymousID:other'),
      }),
    ),
  });
  const reopened = await session.restart(mismatched);
  expect(await reopened.game.purchases.products()).toEqual({ status: 'unavailable', products: [] });
  expect(await reopened.purchaseIdentity()).toEqual(identity);
  const conflict = await reopened.restart(
    revenueCatBilling({
      config: { ...validationConfig, apiKey: 'appl_conflict' },
      platform: 'ios',
      runtime,
    }),
  );
  expect(await conflict.game.purchases.products()).toEqual({ status: 'unavailable', products: [] });
  expect(sdk.configurations).toEqual(['appl_validation']);
});

it('keeps free play usable when the configured SDK rejects billing reads', async () => {
  const sdk = revenueCatFake();
  const selected = revenueCatBilling({
    config: validationConfig,
    platform: 'ios',
    runtime: revenueCatRuntime(() =>
      Promise.resolve({
        ...sdk,
        getCustomerInfo: () => Promise.reject(new Error('offline')),
        getProducts: () => Promise.reject(new Error('store unavailable')),
      }),
    ),
  });
  const session = await startObservedTestGame(selected);
  expect(await session.game.purchases.products()).toEqual({ status: 'unavailable', products: [] });
  expect(await session.game.purchases.restore()).toEqual({ status: 'unavailable' });
  session.game.tap();
  await session.game.flushTaps();
  expect(session.game.getSnapshot().state.cashCents).toBe(100n);
  expect(await session.purchaseRecords()).toEqual([]);
});
