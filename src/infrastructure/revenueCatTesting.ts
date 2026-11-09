import type { RevenueCatInfo, RevenueCatSdk } from './revenueCatRuntime';

export const validationConfig = {
  profile: 'revenuecat-validation',
  environment: 'sandbox',
  store: 'apple',
  appId: 'com.pocketmogul.dev',
  apiKey: 'appl_validation',
  productId: 'pm_validation_exemption',
  entitlementId: 'pm_validation_exemption',
} as const;

export function revenueCatFake() {
  const listeners = new Set<(info: RevenueCatInfo) => void>();
  const configurations: string[] = [];
  const info = { requestDate: '2027-01-15T08:00:00Z', entitlements: { verification: 'VERIFIED' } };
  const sdk: RevenueCatSdk = {
    isConfigured: () => Promise.resolve(false),
    configure: (key) => {
      configurations.push(key);
    },
    getAppUserID: () => Promise.resolve('$RCAnonymousID:test'),
    getProducts: () =>
      Promise.resolve([
        { identifier: validationConfig.productId, title: 'Exonération', priceString: '1,99 €' },
      ]),
    getCustomerInfo: () => Promise.resolve(info),
    addCustomerInfoUpdateListener: (listener) => {
      listeners.add(listener);
    },
    removeCustomerInfoUpdateListener: (listener) => {
      listeners.delete(listener);
    },
  };
  return {
    ...sdk,
    configurations,
    listeners,
    emit: () => {
      for (const listener of listeners) listener(info);
    },
  };
}
