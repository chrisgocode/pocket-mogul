import { Alert } from 'react-native';
import { waitFor } from '@testing-library/react-native';
import { fakeClock, startObservedTestGame } from '@/application/testGame';
import { revenueCatBilling } from '@/infrastructure/revenueCatBilling';
import { revenueCatRuntime } from '@/infrastructure/revenueCatRuntime';
import {
  revenueCatFake,
  storeKitFake,
  storeKitPurchase,
  validationConfig,
} from '@/infrastructure/revenueCatTesting';
import { installBillingValidationDriver } from './billingValidation';

jest.mock('expo-dev-client', () => ({
  registerDevMenuItems: jest.fn().mockResolvedValue(undefined),
}));

const START_MS = 1_800_000_000_000;

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

async function validationGame(input: {
  checkout: boolean;
  storeKit: ReturnType<typeof storeKitFake>;
}) {
  jest.replaceProperty(Object.assign(globalThis, { __DEV__ }), '__DEV__', false);
  const sdk = revenueCatFake();
  const clock = fakeClock(START_MS);
  const selected = revenueCatBilling({
    config: input.checkout ? { ...validationConfig, checkout: 'sandbox' } : validationConfig,
    platform: 'ios',
    runtime: revenueCatRuntime(() => Promise.resolve(sdk)),
    storeKit: { evidence: () => Promise.resolve(input.storeKit), clock },
  });
  const { validation, ...billing } = selected;
  const session = await startObservedTestGame({ ...billing, clock });
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  installBillingValidationDriver({ game: session.game, validation });
  await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
  return { session, sdk, alert };
}

type AlertSpy = jest.SpiedFunction<typeof Alert.alert>;

function press(alert: AlertSpy, text: string): void {
  const buttons = alert.mock.lastCall?.[2];
  buttons?.find((button) => button.text === text)?.onPress?.();
}

function labels(alert: AlertSpy): readonly (string | undefined)[] {
  const buttons = alert.mock.lastCall?.[2];
  return buttons?.map((button) => button.text) ?? [];
}

it('reads redacted StoreKit fields at launch without an App Store sign-in prompt', async () => {
  const storeKit = storeKitFake({ entitlements: [storeKitPurchase], latest: storeKitPurchase });
  const { session, alert } = await validationGame({ checkout: false, storeKit });
  const report = String(alert.mock.lastCall?.[1]);
  expect(storeKit.syncs()).toBe(0);
  expect(report).toContain(
    JSON.stringify({
      status: 'read',
      originalId: '…6789',
      appBundleId: 'com.chrisgocode.pocketfortune',
      environment: 'sandbox',
      productType: 'nonConsumable',
      ownershipType: 'purchased',
      signature: 'verified',
      revocation: 'none',
      entitlement: 'current',
    }),
  );
  expect(report).not.toContain(storeKitPurchase.originalId);
  expect(labels(alert)).toEqual(['Read again', 'Restore purchases', 'Recover', 'Continue']);
  press(alert, 'Read again');
  await waitFor(() => expect(alert).toHaveBeenCalledTimes(2));
  press(alert, 'Recover');
  await waitFor(() => expect(alert).toHaveBeenCalledTimes(3));
  expect(storeKit.syncs()).toBe(0);
  expect(await session.purchaseRecords()).toEqual([]);
  session.game.purchases.dispose();
});

it('syncs with the App Store only when the tester presses Restore', async () => {
  const storeKit = storeKitFake({ entitlements: [storeKitPurchase], latest: storeKitPurchase });
  const { session, alert } = await validationGame({ checkout: false, storeKit });
  press(alert, 'Restore purchases');
  await waitFor(() => expect(alert).toHaveBeenCalledTimes(2));
  expect(storeKit.syncs()).toBe(1);
  expect(alert.mock.lastCall?.[1]).toContain('"last":{"action":"restore","outcome":"current"}');
  expect(alert.mock.lastCall?.[1]).toContain('"tax":{"status":"exempt","entitlements":1}');
  expect(await session.purchaseRecords()).toHaveLength(1);
  session.game.purchases.dispose();
});

it('purchases the test product through Game once when sandbox checkout is enabled', async () => {
  const storeKit = storeKitFake();
  const { session, sdk, alert } = await validationGame({ checkout: true, storeKit });
  expect(alert.mock.lastCall?.[1]).toContain('"checkout":"sandbox"');
  expect(alert.mock.lastCall?.[1]).toContain('"storeKit":{"status":"none"}');
  storeKit.change({ entitlements: [storeKitPurchase], latest: storeKitPurchase });
  press(alert, 'Purchase test product');
  await waitFor(() => expect(alert).toHaveBeenCalledTimes(2));
  expect(alert.mock.lastCall?.[1]).toContain('"last":{"action":"purchase","outcome":"delivered"}');
  press(alert, 'Purchase test product');
  await waitFor(() => expect(alert).toHaveBeenCalledTimes(3));
  expect(sdk.checkouts).toEqual(['pm_tax_exemption', 'pm_tax_exemption']);
  expect(alert.mock.lastCall?.[1]).toContain('"tax":{"status":"exempt","entitlements":1}');
  expect(await session.purchaseRecords()).toHaveLength(1);
  expect(storeKit.syncs()).toBe(0);
  session.game.purchases.dispose();
});

it('offers no purchase control and starts no checkout without the sandbox opt-in', async () => {
  const { session, sdk, alert } = await validationGame({
    checkout: false,
    storeKit: storeKitFake(),
  });
  expect(labels(alert)).not.toContain('Purchase test product');
  const driver = (globalThis as { pocketFortuneBillingValidation?: { purchase: () => unknown } })
    .pocketFortuneBillingValidation;
  await driver?.purchase();
  expect(sdk.checkouts).toEqual([]);
  expect(await session.game.purchases.purchase('pm_tax_exemption')).toEqual({
    status: 'disabled',
  });
  expect(sdk.checkouts).toEqual([]);
  session.game.purchases.dispose();
});
