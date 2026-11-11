import { revenueCatBilling } from '@/infrastructure/revenueCatBilling';
import { revenueCatRuntime } from '@/infrastructure/revenueCatRuntime';
import {
  revenueCatFake,
  storeKitFake,
  storeKitPurchase,
  validationConfig,
} from '@/infrastructure/revenueCatTesting';
import { scriptedBilling } from './scriptedBilling';
import { deferred, fakeClock, startObservedTestGame, type FakeClock } from './testGame';

const START_MS = 1_800_000_000_000;

const PROMPT_MS = 30_000;
const INTERACTIVE_LIMIT_MS = 300_000;

function storeKitSelection(storeKit: ReturnType<typeof storeKitFake>, clock: FakeClock) {
  const selected = revenueCatBilling({
    config: validationConfig,
    platform: 'ios',
    runtime: revenueCatRuntime(() => Promise.resolve(revenueCatFake())),
    storeKit: () => Promise.resolve(storeKit),
    clock,
  });
  return { ...selected, clock };
}

function storeKitGame(storeKit: ReturnType<typeof storeKitFake>, clock = fakeClock(START_MS)) {
  return startObservedTestGame(storeKitSelection(storeKit, clock));
}

async function pendingCheckout() {
  const billing = scriptedBilling({
    purchases: [{ status: 'pending', productId: validationConfig.productId }],
  });
  const session = await startObservedTestGame({
    ...storeKitSelection(storeKitFake(), fakeClock(START_MS)),
    billing,
  });
  await session.game.purchases.purchase(validationConfig.productId);
  return session;
}

it('delivers verified in-scope StoreKit ownership only after an explicit restore syncs', async () => {
  const storeKit = storeKitFake({ entitlements: [storeKitPurchase] });
  const session = await storeKitGame(storeKit);
  expect(await session.purchaseRecords()).toEqual([]);
  expect(storeKit.syncs()).toBe(0);
  expect(await session.game.purchases.restore()).toMatchObject({
    status: 'current',
    authority: 'authoritative',
    coverage: 'complete',
    observedAtMs: START_MS,
  });
  expect(storeKit.syncs()).toBe(1);
  expect((await session.purchaseRecords()).map((record) => record.ownership)).toEqual([
    {
      reference: {
        store: 'apple',
        appId: 'com.chrisgocode.pocketfortune',
        environment: 'sandbox',
        purchaseId: '2000000123456789',
        productId: 'pm_tax_exemption',
      },
      productClass: 'nonConsumable',
      verification: { source: 'store', verifiedAtMs: 1_799_999_000_000 },
      completion: { owner: 'provider' },
    },
  ]);
});

it.each([
  { ...storeKitPurchase, appBundleId: 'com.other.app' },
  { ...storeKitPurchase, environment: 'production' },
  { ...storeKitPurchase, environment: 'xcode' },
  { ...storeKitPurchase, productType: 'consumable' },
  { ...storeKitPurchase, ownershipType: 'familyShared' },
  { ...storeKitPurchase, productId: 'pm_other' },
  { ...storeKitPurchase, originalId: '' },
])('grants nothing for out-of-scope StoreKit evidence %#', async (record) => {
  const session = await storeKitGame(storeKitFake({ entitlements: [record] }));
  expect(await session.game.purchases.restore()).toMatchObject({ status: 'current' });
  expect(await session.purchaseRecords()).toEqual([]);
});

it('reports unverified StoreKit evidence as a verification failure and grants nothing', async () => {
  const storeKit = storeKitFake({
    entitlements: [storeKitPurchase, { ...storeKitPurchase, originalId: '2', verified: false }],
  });
  const session = await storeKitGame(storeKit);
  expect(await session.game.purchases.restore()).toEqual({ status: 'verificationFailed' });
  expect(session.game.purchases.getState()).toEqual({
    status: 'failed',
    reason: 'verificationFailed',
  });
  expect(await session.purchaseRecords()).toEqual([]);
});

it('waits for an App Store sign-in prompt during an explicit restore', async () => {
  const signedIn = deferred();
  const syncing = deferred();
  const storeKit = storeKitFake({
    entitlements: [storeKitPurchase],
    sync: () => {
      syncing.resolve();
      return signedIn.promise;
    },
  });
  const clock = fakeClock(START_MS);
  const session = await storeKitGame(storeKit, clock);
  const restoring = session.game.purchases.restore();
  await syncing.promise;
  clock.advance(PROMPT_MS);
  signedIn.resolve();
  expect(await restoring).toMatchObject({ authority: 'authoritative', observedAtMs: START_MS });
  expect(await session.purchaseRecords()).toHaveLength(1);
});

it('gives up on a restore prompt after the interactive limit and ignores its late result', async () => {
  const signedIn = deferred();
  const syncing = deferred();
  const storeKit = storeKitFake({
    entitlements: [storeKitPurchase],
    sync: () => {
      syncing.resolve();
      return signedIn.promise;
    },
  });
  const clock = fakeClock(START_MS);
  const session = await storeKitGame(storeKit, clock);
  const restoring = session.game.purchases.restore();
  await syncing.promise;
  clock.advance(INTERACTIVE_LIMIT_MS);
  expect(await restoring).toEqual({ status: 'unavailable' });
  signedIn.resolve();
  await session.game.purchases.recover();
  expect(await session.purchaseRecords()).toEqual([]);
  expect(storeKit.syncs()).toBe(1);
});

it('never prompts or trusts StoreKit during launch, foreground or callback recovery', async () => {
  const storeKit = storeKitFake({ entitlements: [storeKitPurchase] });
  const session = await storeKitGame(storeKit);
  storeKit.change({ entitlements: [storeKitPurchase] });
  await session.game.purchases.recover();
  expect(storeKit.syncs()).toBe(0);
  expect(await session.purchaseRecords()).toEqual([]);
});

it('keeps access and grants nothing when the App Store sync fails', async () => {
  const storeKit = storeKitFake({ entitlements: [storeKitPurchase] });
  const session = await storeKitGame(storeKit);
  await session.game.purchases.restore();
  storeKit.change({ sync: () => Promise.reject(new Error('cancelled sign-in')) });
  expect(await session.game.purchases.restore()).toEqual({ status: 'unavailable' });
  expect(await session.purchaseRecords()).toHaveLength(1);
});

it('clears an Apple non-consumable checkout guard only after a fresh restore shows no ownership', async () => {
  const session = await pendingCheckout();
  const storeKit = storeKitFake();
  const reopened = await session.restart(storeKitSelection(storeKit, fakeClock(START_MS + 60_000)));
  expect(reopened.game.purchases.getState()).toEqual({
    status: 'pending',
    productId: 'pm_tax_exemption',
  });
  await reopened.game.purchases.recover();
  expect((await reopened.purchaseIdentity())?.checkout).toBeDefined();
  await reopened.game.purchases.restore();
  expect(reopened.game.purchases.getState()).toEqual({ status: 'ready' });
  expect((await reopened.purchaseIdentity())?.checkout).toBeUndefined();
  expect(await reopened.purchaseRecords()).toEqual([]);
});

it('keeps the checkout guard when the restore sync fails', async () => {
  const session = await pendingCheckout();
  const storeKit = storeKitFake({ sync: () => Promise.reject(new Error('offline')) });
  const reopened = await session.restart(storeKitSelection(storeKit, fakeClock(START_MS + 60_000)));
  expect(await reopened.game.purchases.restore()).toEqual({ status: 'unavailable' });
  expect(reopened.game.purchases.getState()).toEqual({
    status: 'pending',
    productId: 'pm_tax_exemption',
  });
  expect((await reopened.purchaseIdentity())?.checkout).toBeDefined();
});

it('delivers an approved pending purchase at the next restore and resolves its guard', async () => {
  const session = await pendingCheckout();
  const storeKit = storeKitFake({ entitlements: [storeKitPurchase] });
  const reopened = await session.restart(storeKitSelection(storeKit, fakeClock(START_MS + 60_000)));
  await reopened.game.purchases.restore();
  expect(await reopened.purchaseRecords()).toHaveLength(1);
  expect(reopened.game.purchases.getState()).toEqual({ status: 'ready' });
  expect(await reopened.game.purchases.purchase('pm_tax_exemption')).toEqual({
    status: 'delivered',
  });
});

it('removes refunded access prospectively at the next restore and ignores later callbacks', async () => {
  const storeKit = storeKitFake({ entitlements: [storeKitPurchase] });
  const clock = fakeClock(START_MS);
  const session = await storeKitGame(storeKit, clock);
  await session.game.purchases.restore();
  clock.advance(60_000);
  const refunded = { ...storeKitPurchase, revocationDateMs: START_MS + 30_000 };
  storeKit.change({ entitlements: [], latest: refunded });
  await session.game.purchases.recover();
  expect((await session.purchaseRecords())[0]?.currentOwnership?.status).toBe('active');
  await session.game.purchases.restore();
  expect((await session.purchaseRecords())[0]?.currentOwnership).toEqual({
    status: 'removed',
    observedAtMs: START_MS + 60_000,
  });
  storeKit.change({ entitlements: [storeKitPurchase] });
  await session.game.purchases.recover();
  expect((await session.purchaseRecords())[0]?.currentOwnership?.status).toBe('removed');
});

it('treats missing entitlements as no evidence of removal', async () => {
  const storeKit = storeKitFake({ entitlements: [storeKitPurchase] });
  const session = await storeKitGame(storeKit);
  await session.game.purchases.restore();
  storeKit.change({ entitlements: [] });
  await session.game.purchases.restore();
  expect((await session.purchaseRecords())[0]?.currentOwnership?.status).toBe('active');
});

it('subscribes to StoreKit updates for each Game and removes the subscription on disposal', async () => {
  const storeKit = storeKitFake();
  const session = await storeKitGame(storeKit);
  expect(storeKit.listeners.size).toBe(1);
  session.game.purchases.dispose();
  await Promise.resolve();
  expect(storeKit.listeners.size).toBe(0);
});
