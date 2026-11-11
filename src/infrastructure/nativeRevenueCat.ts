import { revenueCatRuntime } from './revenueCatRuntime';
import type { RevenueCatPurchase, RevenueCatSdk } from './revenueCatRuntime';
import type { RevenueCatErrorName } from './revenueCatPurchase';
import { revenueCatEvidenceProbe } from './revenueCatEvidenceProbe';
import { deviceClock } from './deviceClock';

const probe = revenueCatEvidenceProbe(deviceClock);
export const nativeRevenueCatEvidence = { read: probe.read, invalidate: probe.invalidate };

const loadNative = () => import('react-native-purchases');

type NativeModule = Awaited<ReturnType<typeof loadNative>>;

export const nativeRevenueCat = revenueCatRuntime(async () => {
  const native = await loadNative();
  const { default: Purchases, PRODUCT_CATEGORY, LOG_LEVEL } = native;
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
    purchase: (productId) => purchaseProduct(native, productId),
    getCustomerInfo: () => Purchases.getCustomerInfo(),
    addCustomerInfoUpdateListener: (listener) => Purchases.addCustomerInfoUpdateListener(listener),
    removeCustomerInfoUpdateListener: (listener) =>
      Purchases.removeCustomerInfoUpdateListener(listener),
  };
  return probe.attach({ sdk, invalidate: () => Purchases.invalidateCustomerInfoCache() });
});

async function purchaseProduct(
  native: NativeModule,
  productId: string,
): Promise<RevenueCatPurchase> {
  const { default: Purchases, PRODUCT_CATEGORY } = native;
  try {
    const products = await Purchases.getProducts([productId], PRODUCT_CATEGORY.NON_SUBSCRIPTION);
    const product = products.find((candidate) => candidate.identifier === productId);
    if (product === undefined)
      return { status: 'failed', error: 'PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR' };
    const result = await Purchases.purchaseStoreProduct(product);
    return { status: 'purchased', productId: result.productIdentifier };
  } catch (error) {
    return { status: 'failed', error: errorName(native, error) };
  }
}

function errorName(native: NativeModule, error: unknown): RevenueCatErrorName | 'unknown' {
  if (!native.isPurchasesError(error)) return 'unknown';
  const codes = native.PURCHASES_ERROR_CODE;
  const name = Object.entries(codes).find(([, code]) => code === error.code)?.[0];
  return name !== undefined && isErrorName(codes, name) ? name : 'unknown';
}

function isErrorName(codes: object, name: string): name is RevenueCatErrorName {
  return Object.hasOwn(codes, name);
}
