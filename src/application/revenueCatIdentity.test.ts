import { storeKitFake, storeKitPurchase } from '@/infrastructure/revenueCatTesting';
import {
  PRODUCT,
  START_MS,
  checkoutGame,
  checkoutSelection,
  failed,
} from './revenueCatCheckoutTesting';
import { fakeClock } from './testGame';

const RELAUNCH_MS = START_MS + 60_000;
const owned = () => storeKitFake({ entitlements: [storeKitPurchase], latest: storeKitPurchase });

it('keeps the anonymous provider identity and permanent access through Reset Save and restart', async () => {
  const { session, sdk } = await checkoutGame();
  await session.game.purchases.purchase(PRODUCT);
  session.game.tap();
  await session.game.flushTaps();
  const identity = await session.purchaseIdentity();
  expect(identity).toMatchObject({ providerReference: '$RCAnonymousID:test' });
  await session.game.purchases.recover();
  await session.game.resetSave('reset-owned');
  expect(session.game.getSnapshot().state.tax.status).toBe('exempt');
  const relaunch = checkoutSelection({ storeKit: owned(), clock: fakeClock(RELAUNCH_MS) });
  const reopened = await session.restart(relaunch.selected);
  await reopened.game.purchases.recover();
  expect(await reopened.purchaseIdentity()).toEqual(identity);
  expect(reopened.game.getSnapshot().state.cashCents).toBe(0n);
  expect(reopened.game.getSnapshot().state.tax.status).toBe('exempt');
  expect(await reopened.purchaseRecords()).toHaveLength(1);
  expect([...sdk.checkouts, ...relaunch.sdk.checkouts]).toEqual([PRODUCT]);
  expect([...sdk.transfers, ...relaunch.sdk.transfers]).toEqual([]);
});

it('keeps an unresolved checkout guard through Reset Save so no second checkout starts', async () => {
  const { session, sdk } = await checkoutGame({
    purchase: failed('PAYMENT_PENDING_ERROR'),
    storeKit: storeKitFake(),
  });
  await session.game.purchases.purchase(PRODUCT);
  await session.game.resetSave('reset-pending');
  const relaunch = checkoutSelection({ storeKit: storeKitFake(), clock: fakeClock(RELAUNCH_MS) });
  const reopened = await session.restart(relaunch.selected);
  expect((await reopened.purchaseIdentity())?.checkout).toEqual({
    status: 'pending',
    productId: PRODUCT,
  });
  expect(await reopened.game.purchases.purchase(PRODUCT)).toEqual({ status: 'unavailable' });
  expect([...sdk.checkouts, ...relaunch.sdk.checkouts]).toEqual([PRODUCT]);
});

it('adopts the SDK identity when it disagrees with the saved reference and keeps committed access', async () => {
  const { session } = await checkoutGame();
  await session.game.purchases.purchase(PRODUCT);
  const identity = await session.purchaseIdentity();
  const relaunch = checkoutSelection({
    appUserId: '$RCAnonymousID:replaced',
    storeKit: owned(),
    clock: fakeClock(RELAUNCH_MS),
  });
  const reopened = await session.restart(relaunch.selected);
  await reopened.game.purchases.recover();
  expect(await reopened.game.purchases.products()).toMatchObject({ status: 'available' });
  expect(await reopened.purchaseIdentity()).toEqual({
    ...identity,
    providerReference: '$RCAnonymousID:replaced',
  });
  expect(reopened.game.getSnapshot().state.tax.status).toBe('exempt');
  expect(await reopened.purchaseRecords()).toHaveLength(1);
  expect(relaunch.storeKit.syncs()).toBe(0);
  expect(relaunch.sdk.transfers).toEqual([]);
  expect(relaunch.selected.validation?.provider()).toEqual({
    identity: 'replaced',
    transfer: 'notRequested',
  });
});

it('keeps an unresolved checkout guard when the SDK identity was replaced', async () => {
  const { session, sdk } = await checkoutGame({
    purchase: failed('PAYMENT_PENDING_ERROR'),
    storeKit: storeKitFake(),
  });
  await session.game.purchases.purchase(PRODUCT);
  const relaunch = checkoutSelection({
    appUserId: '$RCAnonymousID:replaced',
    storeKit: storeKitFake(),
    clock: fakeClock(RELAUNCH_MS),
  });
  const reopened = await session.restart(relaunch.selected);
  expect(await reopened.game.purchases.purchase(PRODUCT)).toEqual({ status: 'unavailable' });
  expect([...sdk.checkouts, ...relaunch.sdk.checkouts]).toEqual([PRODUCT]);
});
