import { revenueCatRuntime } from './revenueCatRuntime';
import type { RevenueCatSdk } from './revenueCatRuntime';
import { revenueCatEvidenceProbe } from './revenueCatEvidenceProbe';
import { deviceClock } from './deviceClock';

const probe = revenueCatEvidenceProbe(deviceClock);
export const nativeRevenueCatEvidence = { read: probe.read, invalidate: probe.invalidate };

export const nativeRevenueCat = revenueCatRuntime(async () => {
  const {
    default: Purchases,
    PRODUCT_CATEGORY,
    LOG_LEVEL,
  } = await import('react-native-purchases');
  const sdk: RevenueCatSdk = {
    isConfigured: () => Purchases.isConfigured(),
    configure: (apiKey) => {
      Purchases.setLogHandler(() => undefined);
      void Purchases.setLogLevel(LOG_LEVEL.ERROR).catch(() => undefined);
      Purchases.configure({
        apiKey,
        entitlementVerificationMode: Purchases.ENTITLEMENT_VERIFICATION_MODE.INFORMATIONAL,
      });
    },
    getAppUserID: () => Purchases.getAppUserID(),
    getProducts: (ids) => Purchases.getProducts(ids, PRODUCT_CATEGORY.NON_SUBSCRIPTION),
    getCustomerInfo: () => Purchases.getCustomerInfo(),
    addCustomerInfoUpdateListener: (listener) => Purchases.addCustomerInfoUpdateListener(listener),
    removeCustomerInfoUpdateListener: (listener) =>
      Purchases.removeCustomerInfoUpdateListener(listener),
  };
  return probe.attach({ sdk, invalidate: () => Purchases.invalidateCustomerInfoCache() });
});
