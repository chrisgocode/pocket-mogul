import { getContent } from '@/content';
import { dollars } from '@/domain/money';
import { taxLiabilityCents } from '@/domain/tax/assessment';
import { ownedBusiness } from '@/domain/testRules';
import { revenueCatRuntime } from '@/infrastructure/revenueCatRuntime';
import { revenueCatFake, storeKitFake, storeKitPurchase } from '@/infrastructure/revenueCatTesting';
import {
  PRODUCT,
  START_MS,
  checkoutGame,
  checkoutSelection,
  relaunchSelection,
} from './revenueCatCheckoutTesting';
import { taxReturnOwner } from './taxTesting';
import { fakeClock, startObservedTestGame, startTestGameFrom, withoutIncidents } from './testGame';

const PROPAGATION_MS = 900_000;
const REFUNDED_AT_MS = START_MS + 60_000;
const owned = { entitlements: [storeKitPurchase], latest: storeKitPurchase };
const refunded = {
  entitlements: [],
  latest: { ...storeKitPurchase, revocationDateMs: REFUNDED_AT_MS },
};

async function refundedOwner() {
  const storeKit = storeKitFake(owned);
  const owner = await checkoutGame({ storeKit });
  await owner.session.game.purchases.purchase(PRODUCT);
  owner.session.clock.advance(PROPAGATION_MS);
  storeKit.change(refunded);
  return owner;
}

it('records the store refund time separately from when the Game observed it', async () => {
  const { session } = await refundedOwner();
  await session.game.purchases.recover();
  expect(session.game.getSnapshot().state.tax.status).toBe('exempt');
  expect(await session.game.purchases.restore()).toMatchObject({
    observedAtMs: START_MS + PROPAGATION_MS,
    removals: [{ purchaseId: storeKitPurchase.originalId, revokedAtMs: REFUNDED_AT_MS }],
  });
  expect(session.game.getSnapshot().state.tax.status).toBe('active');
  expect((await session.purchaseRecords())[0]?.currentOwnership).toEqual({
    status: 'removed',
    observedAtMs: START_MS + PROPAGATION_MS,
    revokedAtMs: REFUNDED_AT_MS,
  });
});

it('removes access once the refund propagates, even after a later Restore still showed it owned', async () => {
  const storeKit = storeKitFake(owned);
  const { session } = await checkoutGame({ storeKit });
  await session.game.purchases.purchase(PRODUCT);
  session.clock.advance(PROPAGATION_MS);
  await session.game.purchases.restore();
  session.clock.advance(PROPAGATION_MS);
  storeKit.change(refunded);
  await session.game.purchases.restore();
  expect(session.game.getSnapshot().state.tax.status).toBe('active');
  expect((await session.purchaseRecords())[0]?.currentOwnership).toMatchObject({
    status: 'removed',
    observedAtMs: START_MS + 2 * PROPAGATION_MS,
  });
});

const failedSync = () => Promise.reject(new Error('offline'));

it.each([
  { name: 'a failed App Store sync', script: { ...refunded, sync: failedSync } },
  { name: 'an empty inventory', script: { entitlements: [] } },
  { name: 'an unverified refund', script: { latest: { ...refunded.latest, verified: false } } },
  {
    name: 'a refund for another app',
    script: { latest: { ...refunded.latest, appBundleId: 'other.app' } },
  },
  {
    name: 'a production refund',
    script: { latest: { ...refunded.latest, environment: 'production' } },
  },
  {
    name: 'a family-shared refund',
    script: { latest: { ...refunded.latest, ownershipType: 'familyShared' } },
  },
])('keeps access through $name', async ({ script }) => {
  const storeKit = storeKitFake(owned);
  const { session } = await checkoutGame({ storeKit });
  await session.game.purchases.purchase(PRODUCT);
  storeKit.change(script);
  await session.game.purchases.restore();
  await session.game.purchases.recover();
  expect(session.game.getSnapshot().state.tax.status).toBe('exempt');
  expect((await session.purchaseRecords())[0]?.currentOwnership?.status).not.toBe('removed');
});

it('never re-grants a refunded purchase from replayed checkout, CustomerInfo or StoreKit callbacks', async () => {
  const { session, sdk, storeKit } = await refundedOwner();
  await session.game.purchases.restore();
  storeKit.change(owned);
  sdk.emit();
  await session.game.purchases.recover();
  await session.game.purchases.purchase(PRODUCT);
  expect(session.game.getSnapshot().state.tax.status).toBe('active');
  expect(await session.purchaseRecords()).toMatchObject([
    { currentOwnership: { status: 'removed', revokedAtMs: REFUNDED_AT_MS } },
  ]);
});

it('rolls back a refund whose save fails, then keeps the removal through restart and Reset Save', async () => {
  const { session } = await refundedOwner();
  const { revision, tax } = session.game.getSnapshot().state;
  session.faults.failWritesMatching = /INSERT INTO save_state/;
  expect(await session.game.purchases.restore()).toEqual({ status: 'saveFailed' });
  expect(session.game.getSnapshot().state).toMatchObject({ revision, tax });
  expect((await session.purchaseRecords())[0]?.currentOwnership?.status).not.toBe('removed');
  session.faults.failWritesMatching = undefined;
  await session.game.purchases.restore();
  await session.game.resetSave('after-refund');
  const reopened = await session.restart(relaunchSelection(storeKitFake(owned)).selected);
  await reopened.game.purchases.recover();
  expect(reopened.game.getSnapshot().state.tax.status).not.toBe('exempt');
  expect(await reopened.purchaseRecords()).toMatchObject([
    { currentOwnership: { status: 'removed', revokedAtMs: REFUNDED_AT_MS } },
  ]);
});

it('keeps access from the legacy entitlement when the store refunds the purchase', async () => {
  const storeKit = storeKitFake(owned);
  const { selected } = checkoutSelection({ storeKit });
  const session = await startObservedTestGame({
    ...selected,
    taxEntitlement: {
      current: () => Promise.resolve({ status: 'verified', transactionId: 'legacy' }),
    },
  });
  await session.game.purchases.purchase(PRODUCT);
  storeKit.change(refunded);
  await session.game.purchases.restore();
  expect(session.game.getSnapshot().state.tax).toMatchObject({
    status: 'exempt',
    entitlementIds: ['legacy'],
  });
  expect((await session.purchaseRecords())[0]?.currentOwnership?.status).toBe('removed');
});

const TEN_HOURS_MS = 36_000_000;
const SIX_HOURS_MS = 21_600_000;

async function exemptOwner(storeKit: ReturnType<typeof storeKitFake>) {
  const owner = taxReturnOwner();
  const state = {
    ...owner,
    tax: { ...owner.tax, basis: { 'business:vending': dollars('150') } },
    clock: { ...owner.clock, lastWallCheckpointMs: START_MS },
    cashCents: dollars('100000'),
    businesses: [ownedBusiness('vending')],
  };
  const { selected } = checkoutSelection({ storeKit });
  const session = await startTestGameFrom(state, {
    ...selected,
    content: withoutIncidents(getContent()),
  });
  await session.game.purchases.purchase(PRODUCT);
  await session.game.purchases.recover();
  return session;
}

it('applies a refund prospectively after one exempt Offline settlement', async () => {
  const session = await exemptOwner(storeKitFake(owned));
  const relaunch = checkoutSelection({
    storeKit: storeKitFake(refunded),
    clock: fakeClock(START_MS + TEN_HOURS_MS),
  });
  const back = await session.restart(relaunch.selected);
  const settled = back.game.getSnapshot().state;
  expect(settled.tax.status).toBe('exempt');
  await back.game.purchases.restore();
  const state = back.game.getSnapshot().state;
  expect(state.tax).toMatchObject({
    status: 'active',
    returns: [{ filing: { status: 'waived' } }],
    debts: [],
    lines: [],
  });
  expect(taxLiabilityCents(state.tax)).toBe(0n);
  expect(state.cashCents).toBe(dollars('102400'));
  expect(state.returnSummary).toEqual(settled.returnSummary);
  expect(state.returnSummary).toMatchObject({
    summary: { earnings: { businesses: dollars('2400') } },
  });
  const offline = (await back.game.readActivity()).filter((entry) => entry.kind === 'offline');
  expect(offline).toHaveLength(1);
  await back.game.pause();
  back.clock.advance(SIX_HOURS_MS);
  await back.game.resume();
  expect(taxLiabilityCents(back.game.getSnapshot().state.tax)).toBeGreaterThan(0n);
});

it('keeps access when RevenueCat lists no products and its customer cache cannot be read', async () => {
  const fake = revenueCatFake();
  const sdk = {
    ...fake,
    getProducts: () => Promise.resolve([]),
    getCustomerInfo: () => Promise.reject(new Error('expired')),
  };
  const storeKit = storeKitFake(owned);
  const { selected } = checkoutSelection({
    storeKit,
    process: { sdk: fake, runtime: revenueCatRuntime(() => Promise.resolve(sdk)) },
  });
  const session = await startObservedTestGame(selected);
  await session.game.purchases.purchase(PRODUCT);
  storeKit.change({ entitlements: [], latest: storeKitPurchase });
  fake.emit();
  await session.game.purchases.recover();
  await session.game.purchases.restore();
  expect(await session.game.purchases.products()).toMatchObject({ products: [] });
  expect(session.game.getSnapshot().state.tax.status).toBe('exempt');
  expect((await session.purchaseRecords())[0]?.currentOwnership?.status).not.toBe('removed');
});
