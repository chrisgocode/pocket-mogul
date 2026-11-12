import { CURRENT_ECONOMY_VERSION, getContent } from '@/content';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { ownedBusiness } from '@/domain/testRules';
import { storeKitFake, storeKitPurchase } from '@/infrastructure/revenueCatTesting';
import {
  PRODUCT,
  START_MS,
  checkoutGame,
  checkoutSelection,
  relaunchSelection,
} from './revenueCatCheckoutTesting';
import {
  deferred,
  fakeClock,
  startObservedTestGame,
  startTestGameFrom,
  withoutIncidents,
  type TestGame,
} from './testGame';

const TEN_HOURS_MS = 36_000_000;
const ownedInventory = { entitlements: [storeKitPurchase], latest: storeKitPurchase };

function storeAccount() {
  const storeKit = storeKitFake({
    sync: () => {
      storeKit.changeWithoutUpdate(ownedInventory);
      return Promise.resolve();
    },
  });
  return storeKit;
}

async function references(session: TestGame) {
  return (await session.purchaseRecords()).map((record) => record.ownership.reference);
}

async function freshInstall(appUserId: string) {
  const install = await checkoutGame({ appUserId, storeKit: storeAccount() });
  install.session.game.tap();
  await install.session.game.flushTaps();
  await install.session.game.purchases.recover();
  return install;
}

it('restores access after a same-store reinstall without restoring progress or charging again', async () => {
  const first = await checkoutGame();
  first.session.game.tap();
  await first.session.game.flushTaps();
  await first.session.game.purchases.purchase(PRODUCT);
  first.session.game.purchases.dispose();
  const { session, sdk, storeKit } = await freshInstall('$RCAnonymousID:reinstalled');
  expect(session.game.getSnapshot().state.tax.status).toBe('active');
  expect(sdk.transfers).toEqual([]);
  expect(await session.game.purchases.restore()).toMatchObject({ status: 'current' });
  const restored = session.game.getSnapshot().state;
  expect(restored.tax.status).toBe('exempt');
  expect(restored.cashCents).toBe(100n);
  expect(await references(session)).toEqual(await references(first.session));
  expect(await session.purchaseRecords()).toHaveLength(1);
  expect(await session.purchaseIdentity()).toMatchObject({
    providerReference: '$RCAnonymousID:reinstalled',
  });
  expect(sdk.checkouts).toEqual([]);
  expect(sdk.transfers).toEqual(['$RCAnonymousID:reinstalled']);
  expect(storeKit.syncs()).toBe(1);
});

it('restores access on a second device while the first keeps its own progress and access', async () => {
  const first = await checkoutGame();
  await first.session.game.purchases.purchase(PRODUCT);
  const firstState = first.session.game.getSnapshot().state;
  const second = await freshInstall('$RCAnonymousID:second-device');
  await second.session.game.purchases.restore();
  await second.session.game.purchases.restore();
  expect(second.session.game.getSnapshot().state.tax.status).toBe('exempt');
  expect(second.session.game.getSnapshot().state.cashCents).toBe(100n);
  expect(await second.session.purchaseRecords()).toHaveLength(1);
  expect(first.session.game.getSnapshot().state).toEqual(firstState);
  expect(await first.session.purchaseIdentity()).toMatchObject({
    providerReference: '$RCAnonymousID:test',
  });
  expect(second.sdk.checkouts).toEqual([]);
});

it('never prompts or requests a transfer from launch, foreground or ownership events', async () => {
  const { session } = await checkoutGame();
  await session.game.purchases.purchase(PRODUCT);
  await session.game.purchases.recover();
  const relaunch = relaunchSelection(storeKitFake(ownedInventory));
  const reopened = await session.restart(relaunch.selected);
  await reopened.game.pause();
  await reopened.game.resume();
  relaunch.sdk.emit();
  relaunch.storeKit.change(ownedInventory);
  await reopened.game.purchases.recover();
  expect(relaunch.storeKit.syncs()).toBe(0);
  expect(relaunch.sdk.transfers).toEqual([]);
  expect(relaunch.selected.validation?.provider()).toEqual({
    identity: 'retained',
    transfer: 'notRequested',
  });
  expect(await reopened.purchaseRecords()).toHaveLength(1);
});

it('keeps restored access when the RevenueCat transfer fails', async () => {
  const { session, selected } = await restoringGame({
    restorePurchases: () => Promise.reject(new Error('offline')),
  });
  expect(await session.game.purchases.restore()).toMatchObject({ status: 'current' });
  await session.game.purchases.recover();
  expect(session.game.getSnapshot().state.tax.status).toBe('exempt');
  expect(selected.validation?.provider()).toEqual({ identity: 'created', transfer: 'failed' });
});

it('does not wait for a stalled RevenueCat transfer before delivering restored access', async () => {
  const { session, selected } = await restoringGame({
    restorePurchases: () => new Promise<void>(() => undefined),
  });
  expect(await session.game.purchases.restore()).toMatchObject({ status: 'current' });
  expect(session.game.getSnapshot().state.tax.status).toBe('exempt');
  expect(selected.validation?.provider()).toEqual({ identity: 'created', transfer: 'requested' });
});

async function restoringGame(script: { restorePurchases: () => Promise<void> }) {
  const { selected } = checkoutSelection({ ...script, storeKit: storeAccount() });
  return { session: await startObservedTestGame(selected), selected };
}

it('requests no transfer and changes nothing when the App Store sync fails', async () => {
  const storeKit = storeKitFake({ sync: () => Promise.reject(new Error('cancelled')) });
  const { session, sdk } = await checkoutGame({ storeKit });
  const before = session.game.getSnapshot();
  expect(await session.game.purchases.restore()).toEqual({ status: 'unavailable' });
  expect(session.game.getSnapshot()).toBe(before);
  expect(sdk.transfers).toEqual([]);
  expect(await session.purchaseRecords()).toEqual([]);
});

it('requests no transfer when the App Store sync finishes after the Game closed', async () => {
  const signedIn = deferred();
  const prompted = deferred();
  const storeKit = storeKitFake({
    sync: () => {
      prompted.resolve();
      return signedIn.promise;
    },
  });
  const { session, sdk } = await checkoutGame({ storeKit });
  const restoring = session.game.purchases.restore();
  await prompted.promise;
  session.game.purchases.dispose();
  signedIn.resolve();
  await restoring;
  expect(sdk.transfers).toEqual([]);
  expect(await session.purchaseRecords()).toEqual([]);
});

it('rolls back a failed restore delivery, then delivers once across repeated restore and reopen', async () => {
  const { session, sdk } = await freshInstall('$RCAnonymousID:reinstalled');
  const before = session.game.getSnapshot();
  session.faults.failWritesMatching = /INSERT INTO purchase_receipts/;
  expect(await session.game.purchases.restore()).toEqual({ status: 'saveFailed' });
  expect(session.game.getSnapshot()).toEqual(before);
  expect(await session.purchaseRecords()).toEqual([]);
  session.faults.failWritesMatching = undefined;
  session.clock.advance(1_000);
  await session.game.purchases.restore();
  const restored = session.game.getSnapshot().state;
  await session.game.purchases.restore();
  expect(session.game.getSnapshot().state).toEqual(restored);
  const relaunch = relaunchSelection(storeKitFake(ownedInventory));
  const reopened = await session.restart(relaunch.selected);
  await reopened.game.purchases.recover();
  expect(reopened.game.getSnapshot().state.tax).toEqual(restored.tax);
  expect(reopened.game.getSnapshot().state.cashCents).toBe(100n);
  expect(await reopened.purchaseRecords()).toHaveLength(1);
  expect([...sdk.checkouts, ...relaunch.sdk.checkouts]).toEqual([]);
});

function unreachable() {
  return checkoutSelection({
    process: { sdk: checkoutSelection().sdk, runtime: () => Promise.reject(new Error('offline')) },
    storeKit: storeKitFake({ sync: () => Promise.reject(new Error('offline')) }),
    clock: fakeClock(START_MS + TEN_HOURS_MS),
  }).selected;
}

it('keeps committed access offline through one Offline settlement and grants nothing new', async () => {
  const content = withoutIncidents(getContent());
  const state = {
    ...freshGameState({
      saveId: 'offline-owner',
      economyVersion: CURRENT_ECONOMY_VERSION,
      wallMs: START_MS,
    }),
    businesses: [ownedBusiness('vending')],
  };
  const owner = await startTestGameFrom(state, { content, ...checkoutSelection().selected });
  await owner.game.purchases.purchase(PRODUCT);
  await owner.game.purchases.recover();
  const stranger = await startTestGameFrom(state, { content, ...checkoutSelection().selected });
  const ownerBack = await owner.restart({ awayMs: TEN_HOURS_MS, ...unreachable() });
  const strangerBack = await stranger.restart({ awayMs: TEN_HOURS_MS, ...unreachable() });
  const settled = ownerBack.game.getSnapshot().state;
  expect(settled.tax.status).toBe('exempt');
  expect(settled.cashCents).toBe(dollars('2400'));
  expect(await ownerBack.game.purchases.products()).toEqual({
    status: 'unavailable',
    products: [],
  });
  expect(await ownerBack.game.purchases.restore()).toEqual({ status: 'unavailable' });
  await ownerBack.game.purchases.recover();
  const after = ownerBack.game.getSnapshot().state;
  expect(after.tax).toEqual(settled.tax);
  expect(after.cashCents).toBe(dollars('2400'));
  expect(after.returnSummary).toEqual(settled.returnSummary);
  expect(await ownerBack.purchaseRecords()).toHaveLength(1);
  await strangerBack.game.purchases.restore();
  expect(strangerBack.game.getSnapshot().state.tax.status).toBe('active');
  expect(strangerBack.game.getSnapshot().state.cashCents).toBe(dollars('2400'));
  expect(await strangerBack.purchaseRecords()).toEqual([]);
});
