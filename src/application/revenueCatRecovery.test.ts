import { storeKitFake, storeKitPurchase } from '@/infrastructure/revenueCatTesting';
import {
  INTERACTIVE_LIMIT_MS,
  PRODUCT,
  START_MS,
  checkoutGame,
  checkoutProcess,
  checkoutSelection,
  failed,
  relaunchSelection,
  untilExempt,
} from './revenueCatCheckoutTesting';
import { deferred, fakeClock, startObservedTestGame } from './testGame';

it('recovers an approved payment after restart through a StoreKit update without a sign-in prompt', async () => {
  const { session, sdk } = await checkoutGame({
    purchase: failed('PAYMENT_PENDING_ERROR'),
    storeKit: storeKitFake(),
  });
  expect(await session.game.purchases.purchase(PRODUCT)).toEqual({
    status: 'pending',
    productId: PRODUCT,
  });
  const relaunch = relaunchSelection(storeKitFake());
  const reopened = await session.restart(relaunch.selected);
  expect(await reopened.game.purchases.purchase(PRODUCT)).toEqual({ status: 'unavailable' });
  const exempt = untilExempt(reopened.game);
  relaunch.storeKit.change({ entitlements: [storeKitPurchase], latest: storeKitPurchase });
  await exempt;
  await reopened.game.purchases.recover();
  expect(await reopened.purchaseRecords()).toHaveLength(1);
  expect((await reopened.purchaseIdentity())?.checkout).toEqual({
    status: 'delivered',
    productId: PRODUCT,
  });
  expect(await reopened.game.purchases.purchase(PRODUCT)).toEqual({ status: 'delivered' });
  expect([...sdk.checkouts, ...relaunch.sdk.checkouts]).toEqual([PRODUCT]);
  expect(relaunch.storeKit.syncs()).toBe(0);
});

it.each([
  { label: 'an unknown RevenueCat error', purchase: failed('UNKNOWN_ERROR') },
  { label: 'a native bridge failure', purchase: () => Promise.reject(new Error('bridge')) },
  {
    label: 'a purchase StoreKit has not recorded yet',
    purchase: (productId: string) => Promise.resolve({ status: 'purchased', productId } as const),
  },
])('keeps an interrupted guard after $label and delivers it on the next launch', async (setup) => {
  const { session, sdk } = await checkoutGame({ ...setup, storeKit: storeKitFake() });
  expect(await session.game.purchases.purchase(PRODUCT)).toEqual({ status: 'unavailable' });
  const relaunch = relaunchSelection(
    storeKitFake({ entitlements: [storeKitPurchase], latest: storeKitPurchase }),
  );
  const reopened = await session.restart(relaunch.selected);
  await reopened.game.purchases.recover();
  expect(reopened.game.getSnapshot().state.tax.status).toBe('exempt');
  expect(await reopened.purchaseRecords()).toHaveLength(1);
  expect(await reopened.game.purchases.purchase(PRODUCT)).toEqual({ status: 'delivered' });
  expect([...sdk.checkouts, ...relaunch.sdk.checkouts]).toEqual([PRODUCT]);
  expect(relaunch.storeKit.syncs()).toBe(0);
});

function openSheet() {
  const requested = deferred();
  const approved = deferred();
  return {
    requested,
    approved,
    purchase: (productId: string) => {
      requested.resolve();
      return approved.promise.then(() => ({ status: 'purchased', productId }) as const);
    },
  };
}

it('keeps the guard through a fresh Restore while the store sheet is still open', async () => {
  const sheet = openSheet();
  const clock = fakeClock(START_MS);
  const storeKit = storeKitFake();
  const { session, sdk } = await checkoutGame({ clock, storeKit, purchase: sheet.purchase });
  const first = session.game.purchases.purchase(PRODUCT);
  await sheet.requested.promise;
  clock.advance(INTERACTIVE_LIMIT_MS);
  expect(await first).toEqual({ status: 'unavailable' });
  clock.advance(1_000);
  await session.game.purchases.restore();
  expect((await session.purchaseIdentity())?.checkout).toEqual({
    status: 'interrupted',
    productId: PRODUCT,
  });
  expect(await session.game.purchases.purchase(PRODUCT)).toEqual({ status: 'unavailable' });
  storeKit.changeWithoutUpdate({ entitlements: [storeKitPurchase], latest: storeKitPurchase });
  const exempt = untilExempt(session.game);
  sheet.approved.resolve();
  await exempt;
  expect(sdk.checkouts).toEqual([PRODUCT]);
});

it('sees a store sheet left open by a previous Game in the same process', async () => {
  const sheet = openSheet();
  const process = checkoutProcess(sheet.purchase);
  const first = checkoutSelection({ process, storeKit: storeKitFake() });
  const session = await startObservedTestGame(first.selected);
  const purchasing = session.game.purchases.purchase(PRODUCT);
  await sheet.requested.promise;
  const storeKit = storeKitFake();
  const relaunch = checkoutSelection({
    process,
    storeKit,
    clock: fakeClock(START_MS + 60_000),
  });
  const reopened = await session.restart(relaunch.selected);
  await reopened.game.purchases.restore();
  expect((await reopened.purchaseIdentity())?.checkout).toEqual({
    status: 'interrupted',
    productId: PRODUCT,
  });
  storeKit.changeWithoutUpdate({ entitlements: [storeKitPurchase], latest: storeKitPurchase });
  const exempt = untilExempt(reopened.game);
  sheet.approved.resolve();
  await exempt;
  expect(await purchasing).toEqual({ status: 'unavailable' });
  expect(process.sdk.checkouts).toEqual([PRODUCT]);
});

it('reconciles a late store sheet result even when every ownership callback is dropped', async () => {
  const sheet = openSheet();
  const clock = fakeClock(START_MS);
  const storeKit = storeKitFake();
  const { session, sdk } = await checkoutGame({ clock, storeKit, purchase: sheet.purchase });
  const first = session.game.purchases.purchase(PRODUCT);
  await sheet.requested.promise;
  clock.advance(INTERACTIVE_LIMIT_MS);
  expect(await first).toEqual({ status: 'unavailable' });
  storeKit.changeWithoutUpdate({ entitlements: [storeKitPurchase], latest: storeKitPurchase });
  const exempt = untilExempt(session.game);
  sheet.approved.resolve();
  await exempt;
  await session.game.purchases.recover();
  expect(await session.purchaseRecords()).toHaveLength(1);
  expect((await session.purchaseIdentity())?.checkout).toEqual({
    status: 'delivered',
    productId: PRODUCT,
  });
  expect(sdk.checkouts).toEqual([PRODUCT]);
  expect(storeKit.syncs()).toBe(0);
});

it('shares one store sheet between concurrent purchase requests', async () => {
  const sheet = openSheet();
  const storeKit = storeKitFake();
  const { session, sdk } = await checkoutGame({ storeKit, purchase: sheet.purchase });
  const first = session.game.purchases.purchase(PRODUCT);
  const second = session.game.purchases.purchase(PRODUCT);
  await sheet.requested.promise;
  storeKit.changeWithoutUpdate({ entitlements: [storeKitPurchase], latest: storeKitPurchase });
  sheet.approved.resolve();
  expect(await Promise.all([first, second])).toEqual([
    { status: 'delivered' },
    { status: 'delivered' },
  ]);
  await session.game.purchases.recover();
  expect(sdk.checkouts).toEqual([PRODUCT]);
  expect(await session.purchaseRecords()).toHaveLength(1);
});

it('writes nothing when the store sheet resolves after the Game closed', async () => {
  const sheet = openSheet();
  const storeKit = storeKitFake();
  const { session } = await checkoutGame({ storeKit, purchase: sheet.purchase });
  const purchasing = session.game.purchases.purchase(PRODUCT);
  await sheet.requested.promise;
  const before = session.game.getSnapshot();
  session.game.purchases.dispose();
  storeKit.change({ entitlements: [storeKitPurchase], latest: storeKitPurchase });
  sheet.approved.resolve();
  expect(await purchasing).toEqual({ status: 'unavailable' });
  expect(session.game.getSnapshot()).toBe(before);
  expect(await session.purchaseRecords()).toEqual([]);
  expect((await session.purchaseIdentity())?.checkout).toEqual({
    status: 'interrupted',
    productId: PRODUCT,
  });
});
