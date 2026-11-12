import { revenueCatBilling } from '@/infrastructure/revenueCatBilling';
import { revenueCatRuntime, type RevenueCatPurchase } from '@/infrastructure/revenueCatRuntime';
import {
  revenueCatFake,
  storeKitFake,
  storeKitPurchase,
  validationConfig,
} from '@/infrastructure/revenueCatTesting';
import { deferred, fakeClock, startObservedTestGame, type FakeClock } from './testGame';

const START_MS = 1_800_000_000_000;
const INTERACTIVE_LIMIT_MS = 300_000;
const PRODUCT = validationConfig.productId;
const checkoutConfig = { ...validationConfig, checkout: 'sandbox' } as const;

type Setup = {
  readonly purchase?: (productId: string) => Promise<RevenueCatPurchase>;
  readonly storeKit?: ReturnType<typeof storeKitFake>;
  readonly clock?: FakeClock;
  readonly config?: unknown;
};

function checkoutSelection(setup: Setup = {}) {
  const sdk = revenueCatFake(setup.purchase === undefined ? {} : { purchase: setup.purchase });
  const storeKit = setup.storeKit ?? storeKitFake({ latest: storeKitPurchase });
  const clock = setup.clock ?? fakeClock(START_MS);
  const selected = revenueCatBilling({
    config: setup.config ?? checkoutConfig,
    platform: 'ios',
    runtime: revenueCatRuntime(() => Promise.resolve(sdk)),
    storeKit: { evidence: () => Promise.resolve(storeKit), clock },
  });
  return { selected: { ...selected, clock }, sdk, storeKit };
}

async function checkoutGame(setup: Setup = {}) {
  const { selected, sdk, storeKit } = checkoutSelection(setup);
  return { session: await startObservedTestGame(selected), sdk, storeKit };
}

function failed(name: Extract<RevenueCatPurchase, { status: 'failed' }>['error']) {
  return (): Promise<RevenueCatPurchase> => Promise.resolve({ status: 'failed', error: name });
}

it('delivers a RevenueCat purchase once only after StoreKit confirms the scoped transaction', async () => {
  const { session, sdk, storeKit } = await checkoutGame();
  expect(await session.game.purchases.purchase(PRODUCT)).toEqual({ status: 'delivered' });
  expect(sdk.checkouts).toEqual([PRODUCT]);
  expect(storeKit.syncs()).toBe(0);
  expect(session.game.getSnapshot().state.tax.status).toBe('exempt');
  expect(await session.purchaseRecords()).toEqual([
    {
      ownership: {
        reference: {
          store: 'apple',
          appId: 'com.chrisgocode.pocketfortune',
          environment: 'sandbox',
          purchaseId: storeKitPurchase.originalId,
          productId: PRODUCT,
        },
        productClass: 'nonConsumable',
        verification: { source: 'store', verifiedAtMs: storeKitPurchase.signedDateMs },
        completion: { owner: 'provider' },
      },
      benefit: 'taxExemption',
      result: { status: 'delivered' },
      completion: 'completed',
    },
  ]);
  expect((await session.purchaseIdentity())?.checkout).toBeUndefined();
});

it('leaves native completion to RevenueCat', () => {
  expect(checkoutSelection().selected.billing.completion).toEqual({ owner: 'provider' });
});

it('never duplicates the benefit across repeated completion, already-owned and restore', async () => {
  const { session, sdk } = await checkoutGame();
  await session.game.purchases.purchase(PRODUCT);
  const exempted = session.game.getSnapshot().state.tax;
  sdk.checkouts.length = 0;
  await session.game.purchases.purchase(PRODUCT);
  await session.game.purchases.restore();
  expect(session.game.getSnapshot().state.tax).toEqual(exempted);
  expect(await session.purchaseRecords()).toHaveLength(1);
});

it('reconciles an already-owned submission through StoreKit without granting twice', async () => {
  const { session } = await checkoutGame({ purchase: failed('PRODUCT_ALREADY_PURCHASED_ERROR') });
  expect(await session.game.purchases.purchase(PRODUCT)).toEqual({ status: 'delivered' });
  expect(await session.game.purchases.purchase(PRODUCT)).toEqual({ status: 'delivered' });
  expect(await session.purchaseRecords()).toHaveLength(1);
});

it.each([
  { error: 'PURCHASE_CANCELLED_ERROR', result: { status: 'cancelled' } },
  { error: 'PURCHASE_NOT_ALLOWED_ERROR', result: { status: 'declined' } },
  { error: 'PURCHASE_INVALID_ERROR', result: { status: 'declined' } },
  { error: 'PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR', result: { status: 'declined' } },
  { error: 'SIGNATURE_VERIFICATION_ERROR', result: { status: 'verificationFailed' } },
] as const)('grants nothing and releases the guard for $error', async ({ error, result }) => {
  const { session } = await checkoutGame({ purchase: failed(error) });
  expect(await session.game.purchases.purchase(PRODUCT)).toEqual(result);
  expect(await session.purchaseRecords()).toEqual([]);
  expect(session.game.getSnapshot().state.tax.status).toBe('notStarted');
  expect((await session.purchaseIdentity())?.checkout).toBeUndefined();
});

it.each([
  { error: 'PAYMENT_PENDING_ERROR', status: 'pending' },
  { error: 'NETWORK_ERROR', status: 'interrupted' },
  { error: 'unknown', status: 'interrupted' },
] as const)('keeps the checkout guard and grants nothing for $error', async ({ error, status }) => {
  const { session } = await checkoutGame({ purchase: failed(error) });
  await session.game.purchases.purchase(PRODUCT);
  expect(await session.purchaseRecords()).toEqual([]);
  expect((await session.purchaseIdentity())?.checkout).toEqual({ status, productId: PRODUCT });
});

it.each([
  { ...storeKitPurchase, verified: false },
  { ...storeKitPurchase, appBundleId: 'com.other.app' },
  { ...storeKitPurchase, environment: 'production' },
  { ...storeKitPurchase, environment: 'xcode' },
  { ...storeKitPurchase, productType: 'consumable' },
  { ...storeKitPurchase, ownershipType: 'familyShared' },
  { ...storeKitPurchase, productId: 'pm_other' },
  { ...storeKitPurchase, originalId: '' },
  { ...storeKitPurchase, revocationDateMs: START_MS },
])('rejects a resolved purchase StoreKit cannot confirm %#', async (latest) => {
  const { session } = await checkoutGame({ storeKit: storeKitFake({ latest }) });
  expect(await session.game.purchases.purchase(PRODUCT)).toEqual({
    status: 'verificationFailed',
  });
  expect(await session.purchaseRecords()).toEqual([]);
});

it('rejects a RevenueCat result for another product', async () => {
  const { session } = await checkoutGame({
    purchase: () => Promise.resolve({ status: 'purchased', productId: 'pm_other' }),
  });
  expect(await session.game.purchases.purchase(PRODUCT)).toEqual({
    status: 'verificationFailed',
  });
  expect(await session.purchaseRecords()).toEqual([]);
});

it('keeps the guard when StoreKit has no record yet and delivers at the next restore', async () => {
  const storeKit = storeKitFake();
  const { session } = await checkoutGame({ storeKit });
  await session.game.purchases.purchase(PRODUCT);
  expect(await session.purchaseRecords()).toEqual([]);
  expect((await session.purchaseIdentity())?.checkout).toEqual({
    status: 'interrupted',
    productId: PRODUCT,
  });
  storeKit.change({ entitlements: [storeKitPurchase], latest: storeKitPurchase });
  await session.game.purchases.restore();
  expect(await session.purchaseRecords()).toHaveLength(1);
  expect((await session.purchaseIdentity())?.checkout).toEqual({
    status: 'delivered',
    productId: PRODUCT,
  });
});

it('gives up on the store sheet after the interactive limit and ignores the late result', async () => {
  const requested = deferred();
  const approved = deferred();
  const clock = fakeClock(START_MS);
  const { session } = await checkoutGame({
    clock,
    purchase: (productId) => {
      requested.resolve();
      return approved.promise.then(() => ({ status: 'purchased', productId }) as const);
    },
  });
  const purchasing = session.game.purchases.purchase(PRODUCT);
  await requested.promise;
  clock.advance(INTERACTIVE_LIMIT_MS);
  expect(await purchasing).toEqual({ status: 'unavailable' });
  approved.resolve();
  await session.game.purchases.recover();
  expect(await session.purchaseRecords()).toEqual([]);
  expect((await session.purchaseIdentity())?.checkout).toEqual({
    status: 'interrupted',
    productId: PRODUCT,
  });
});

it('recovers a provider-completed purchase after a failed local commit at the next restore', async () => {
  const { session, sdk } = await checkoutGame();
  const before = session.game.getSnapshot();
  session.faults.failWritesMatching = /INSERT INTO purchase_receipts/;
  expect(await session.game.purchases.purchase(PRODUCT)).toEqual({ status: 'saveFailed' });
  expect(session.game.getSnapshot()).toEqual(before);
  expect(await session.purchaseRecords()).toEqual([]);
  session.faults.failWritesMatching = undefined;
  const { selected, storeKit } = checkoutSelection({
    storeKit: storeKitFake({ entitlements: [storeKitPurchase], latest: storeKitPurchase }),
    clock: fakeClock(START_MS + 60_000),
  });
  const reopened = await session.restart(selected);
  await reopened.game.purchases.restore();
  expect(storeKit.syncs()).toBe(1);
  expect(reopened.game.getSnapshot().state.tax.status).toBe('exempt');
  expect(await reopened.purchaseRecords()).toHaveLength(1);
  expect(sdk.checkouts).toEqual([PRODUCT]);
});

it.each([
  { label: 'without the sandbox opt-in', config: validationConfig, platform: 'ios' },
  {
    label: 'on Android',
    config: { ...checkoutConfig, store: 'google', apiKey: 'goog_validation' },
    platform: 'android',
  },
])('starts no native checkout $label', async ({ config, platform }) => {
  const sdk = revenueCatFake();
  const selected = revenueCatBilling({
    config,
    platform,
    runtime: revenueCatRuntime(() => Promise.resolve(sdk)),
  });
  const session = await startObservedTestGame(selected);
  expect(await session.game.purchases.purchase(PRODUCT)).toEqual({ status: 'disabled' });
  expect(sdk.checkouts).toEqual([]);
  expect(selected.validation?.checkout).toBe('disabled');
});

it('starts no native checkout for a product outside the authorized mapping', async () => {
  const { session, sdk } = await checkoutGame();
  expect(await session.game.purchases.purchase('pm_other')).toEqual({ status: 'disabled' });
  expect(sdk.checkouts).toEqual([]);
});

it('traces a RevenueCat failure without reading StoreKit and keeps the StoreKit step on success', async () => {
  const failing = checkoutSelection({ purchase: failed('STORE_PROBLEM_ERROR') });
  const session = await startObservedTestGame(failing.selected);
  await session.game.purchases.purchase(PRODUCT);
  expect(failing.selected.validation?.lastCheckout()).toEqual({
    revenueCat: 'STORE_PROBLEM_ERROR',
    storeKit: 'notRead',
  });
  const missing = checkoutSelection({ storeKit: storeKitFake() });
  const second = await startObservedTestGame(missing.selected);
  await second.game.purchases.purchase(PRODUCT);
  expect(missing.selected.validation?.lastCheckout()).toEqual({
    revenueCat: 'purchased',
    storeKit: 'unavailable',
  });
});

it.each([
  { label: 'a confirmed purchase', firstConfirmation: { latest: storeKitPurchase } },
  { label: 'a purchase recovered by Restore', firstConfirmation: {} },
])('starts a new checkout after a refund removed $label', async ({ firstConfirmation }) => {
  const storeKit = storeKitFake(firstConfirmation);
  const clock = fakeClock(START_MS);
  const { session, sdk } = await checkoutGame({ storeKit, clock });
  await session.game.purchases.purchase(PRODUCT);
  storeKit.change({ entitlements: [storeKitPurchase], latest: storeKitPurchase });
  await session.game.purchases.restore();
  clock.advance(60_000);
  storeKit.change({
    entitlements: [],
    latest: { ...storeKitPurchase, revocationDateMs: START_MS + 30_000 },
  });
  await session.game.purchases.restore();
  expect(session.game.getSnapshot().state.tax.status).not.toBe('exempt');
  const repurchase = { ...storeKitPurchase, originalId: '2000000999999999' };
  storeKit.change({ entitlements: [repurchase], latest: repurchase });
  expect(await session.game.purchases.purchase(PRODUCT)).toEqual({ status: 'delivered' });
  expect(sdk.checkouts).toEqual([PRODUCT, PRODUCT]);
  expect(session.game.getSnapshot().state.tax.status).toBe('exempt');
  expect(await session.purchaseRecords()).toHaveLength(2);
});
