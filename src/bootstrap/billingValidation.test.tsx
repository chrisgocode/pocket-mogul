import { Alert } from 'react-native';
import { waitFor } from '@testing-library/react-native';
import { registerDevMenuItems } from 'expo-dev-client';
import { startObservedTestGame } from '@/application/testGame';
import { revenueCatBilling } from '@/infrastructure/revenueCatBilling';
import { revenueCatRuntime } from '@/infrastructure/revenueCatRuntime';
import { revenueCatFake, validationConfig } from '@/infrastructure/revenueCatTesting';
import { installBillingValidationDriver } from './billingValidation';

jest.mock('expo-dev-client', () => ({
  registerDevMenuItems: jest.fn().mockResolvedValue(undefined),
}));

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

it('shows a repeatable read-only report without a development menu in a standalone build', async () => {
  jest.replaceProperty(Object.assign(globalThis, { __DEV__ }), '__DEV__', false);
  const sdk = revenueCatFake();
  const session = await startObservedTestGame(
    revenueCatBilling({
      config: validationConfig,
      platform: 'ios',
      runtime: revenueCatRuntime(() => Promise.resolve(sdk)),
    }),
  );
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  installBillingValidationDriver(session.game);
  await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
  expect(alert.mock.calls[0]?.[1]).toContain('"checkout":"disabled"');
  expect(alert.mock.calls[0]?.[1]).toContain('"displayPrice":"1,99 €"');
  expect(registerDevMenuItems).not.toHaveBeenCalled();
  const retry = alert.mock.calls[0]?.[2]?.[0];
  expect(retry?.text).toBe('Read again');
  retry?.onPress?.();
  await waitFor(() => expect(alert).toHaveBeenCalledTimes(2));
  expect(await session.purchaseRecords()).toEqual([]);
  session.game.purchases.dispose();
});

it('runs read-only validation through Game and displays only localized metadata and redacted status', async () => {
  const sdk = revenueCatFake();
  const session = await startObservedTestGame(
    revenueCatBilling({
      config: validationConfig,
      platform: 'ios',
      runtime: revenueCatRuntime(() => Promise.resolve(sdk)),
    }),
  );
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  installBillingValidationDriver(session.game);
  await waitFor(() => expect(registerDevMenuItems).toHaveBeenCalledTimes(1));
  const menu = jest.mocked(registerDevMenuItems).mock.calls[0]?.[0][0];
  expect(menu?.name).toBe('Read billing validation');
  menu?.callback();
  await waitFor(() =>
    expect(alert).toHaveBeenCalledWith(
      'Billing validation',
      JSON.stringify({
        products: {
          status: 'available',
          products: [
            { productId: 'pm_tax_exemption', displayName: 'Exonération', displayPrice: '1,99 €' },
          ],
        },
        ownership: 'unavailable',
        operation: 'unavailable',
        checkout: 'disabled',
      }),
    ),
  );
  expect(await session.purchaseRecords()).toEqual([]);
  session.game.purchases.dispose();
  alert.mockRestore();
});
