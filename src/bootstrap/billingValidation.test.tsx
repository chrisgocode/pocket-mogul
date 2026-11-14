import { Alert } from 'react-native';
import type { AlertButton } from 'react-native';
import { waitFor } from '@testing-library/react-native';
import { registerDevMenuItems } from 'expo-dev-client';
import { deferred, fakeClock, startObservedTestGame } from '@/application/testGame';
import { revenueCatBilling } from '@/infrastructure/revenueCatBilling';
import { revenueCatRuntime } from '@/infrastructure/revenueCatRuntime';
import { revenueCatFake, validationConfig } from '@/infrastructure/revenueCatTesting';
import { revenueCatEvidenceProbe } from '@/infrastructure/revenueCatEvidenceProbe';
import { installBillingValidationDriver } from './billingValidation';

jest.mock('expo-dev-client', () => ({
  registerDevMenuItems: jest.fn().mockResolvedValue(undefined),
}));

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

it('reports provider observations and explicitly invalidates cache without enabling checkout', async () => {
  jest.replaceProperty(Object.assign(globalThis, { __DEV__ }), '__DEV__', false);
  const probe = revenueCatEvidenceProbe(fakeClock(1_800_000_000_000));
  const invalidated = jest.fn().mockResolvedValue(undefined);
  const session = await startObservedTestGame(
    revenueCatBilling({
      config: validationConfig,
      platform: 'ios',
      runtime: revenueCatRuntime(() =>
        Promise.resolve(probe.attach({ sdk: revenueCatFake(), invalidate: invalidated })),
      ),
    }),
  );
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  installBillingValidationDriver({ game: session.game, probe });
  await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
  const refresh = alert.mock.calls[0]?.[2]?.[1];
  expect(refresh?.text).toBe('Refresh ownership');
  refresh?.onPress?.();
  await waitFor(() => expect(alert).toHaveBeenCalledTimes(2));
  expect(invalidated).toHaveBeenCalledTimes(1);
  expect(alert.mock.calls[1]?.[1]).toBe(
    JSON.stringify({
      products: {
        status: 'available',
        products: [
          {
            productId: 'pm_tax_exemption',
            displayName: 'Exonération',
            displayPrice: '1,99 €',
            price: 1.99,
          },
        ],
      },
      operation: 'unavailable',
      checkout: 'disabled',
      tax: { status: 'notStarted', entitlements: 0 },
      last: { action: 'recover', outcome: 'unavailable' },
      evidence: {
        cache: 'invalidated',
        customerInfo: {
          status: 'returned',
          observedAtMs: 1_800_000_000_000,
          verification: 'verified',
        },
      },
    }),
  );
  expect(await session.purchaseRecords()).toEqual([]);
  session.game.purchases.dispose();
});

it('never invalidates the cache of an externally configured SDK', async () => {
  jest.replaceProperty(Object.assign(globalThis, { __DEV__ }), '__DEV__', false);
  const probe = revenueCatEvidenceProbe(fakeClock(1_800_000_000_000));
  const invalidated = jest.fn().mockResolvedValue(undefined);
  const sdk = { ...revenueCatFake(), isConfigured: () => Promise.resolve(true) };
  const session = await startObservedTestGame(
    revenueCatBilling({
      config: validationConfig,
      platform: 'ios',
      runtime: revenueCatRuntime(() =>
        Promise.resolve(probe.attach({ sdk, invalidate: invalidated })),
      ),
    }),
  );
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  installBillingValidationDriver({ game: session.game, probe });
  await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
  alert.mock.calls[0]?.[2]?.[1]?.onPress?.();
  await waitFor(() => expect(alert).toHaveBeenCalledTimes(2));
  expect(invalidated).not.toHaveBeenCalled();
  expect(await session.purchaseRecords()).toEqual([]);
  session.game.purchases.dispose();
});

it('redacts a failed SDK read after cache invalidation and keeps ownership unavailable', async () => {
  jest.replaceProperty(Object.assign(globalThis, { __DEV__ }), '__DEV__', false);
  const probe = revenueCatEvidenceProbe(fakeClock(1_800_000_000_000));
  const sdk = revenueCatFake();
  const read = jest.fn(sdk.getCustomerInfo);
  const session = await startObservedTestGame(
    revenueCatBilling({
      config: validationConfig,
      platform: 'ios',
      runtime: revenueCatRuntime(() =>
        Promise.resolve(
          probe.attach({
            sdk: { ...sdk, getCustomerInfo: read },
            invalidate: () => {
              read.mockRejectedValue(new Error('private-sdk-error'));
              return Promise.resolve();
            },
          }),
        ),
      ),
    }),
  );
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  installBillingValidationDriver({ game: session.game, probe });
  await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
  alert.mock.calls[0]?.[2]?.[1]?.onPress?.();
  await waitFor(() => expect(alert).toHaveBeenCalledTimes(2));
  const report = alert.mock.calls[1]?.[1];
  expect(report).toContain('"cache":"invalidated","customerInfo":{"status":"unavailable"}');
  expect(report).not.toContain('private-sdk-error');
  expect(report).not.toContain('$RCAnonymousID:test');
  expect(await session.purchaseRecords()).toEqual([]);
  session.game.purchases.dispose();
});

it('bounds cache invalidation and never changes a timeout to success after a late completion', async () => {
  jest.replaceProperty(Object.assign(globalThis, { __DEV__ }), '__DEV__', false);
  const clock = fakeClock(1_800_000_000_000);
  const probe = revenueCatEvidenceProbe(clock);
  const requested = deferred();
  const response = deferred();
  const selected = revenueCatBilling({
    config: validationConfig,
    platform: 'ios',
    runtime: revenueCatRuntime(() =>
      Promise.resolve(
        probe.attach({
          sdk: revenueCatFake(),
          invalidate: () => {
            requested.resolve();
            return response.promise;
          },
        }),
      ),
    ),
  });
  const session = await startObservedTestGame({ ...selected, clock });
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  installBillingValidationDriver({ game: session.game, probe });
  await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
  pressValidationButton(alert.mock.calls[0]?.[2], 'Refresh ownership');
  await requested.promise;
  clock.advance(2_000);
  await waitFor(() => expect(alert).toHaveBeenCalledTimes(2));
  expect(alert.mock.calls[1]?.[1]).toContain('"cache":"unavailable"');
  response.resolve();
  await Promise.resolve();
  pressValidationButton(alert.mock.calls[1]?.[2], 'Read again');
  await waitFor(() => expect(alert).toHaveBeenCalledTimes(3));
  expect(alert.mock.calls[2]?.[1]).toContain('"cache":"unavailable"');
  session.game.purchases.dispose();
});

function pressValidationButton(buttons: readonly AlertButton[] | undefined, text: string): void {
  buttons?.find((button) => button.text === text)?.onPress?.();
}

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
  installBillingValidationDriver({ game: session.game });
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
  installBillingValidationDriver({ game: session.game });
  await waitFor(() => expect(registerDevMenuItems).toHaveBeenCalledTimes(1));
  const menu = jest.mocked(registerDevMenuItems).mock.calls[0]?.[0][0];
  expect(menu?.name).toBe('Billing validation');
  menu?.callback();
  await waitFor(() =>
    expect(alert).toHaveBeenCalledWith(
      'Billing validation',
      JSON.stringify({
        products: {
          status: 'available',
          products: [
            {
              productId: 'pm_tax_exemption',
              displayName: 'Exonération',
              displayPrice: '1,99 €',
              price: 1.99,
            },
          ],
        },
        operation: 'unavailable',
        checkout: 'disabled',
        tax: { status: 'notStarted', entitlements: 0 },
      }),
      expect.any(Array),
    ),
  );
  expect(await session.purchaseRecords()).toEqual([]);
  session.game.purchases.dispose();
  alert.mockRestore();
});
