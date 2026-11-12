import type { StoreKitEvidence, StoreKitTransaction } from './storeKitEvidence';
import type { RevenueCatInfo, RevenueCatPurchase, RevenueCatSdk } from './revenueCatRuntime';

export const validationConfig = {
  profile: 'revenuecat-validation',
  environment: 'sandbox',
  store: 'apple',
  appId: 'com.chrisgocode.pocketfortune',
  apiKey: 'appl_validation',
  productId: 'pm_tax_exemption',
  entitlementId: 'pm_tax_exemption',
} as const;

export type RevenueCatScript = {
  readonly purchase?: (productId: string) => Promise<RevenueCatPurchase>;
  readonly appUserId?: string;
  readonly restorePurchases?: () => Promise<void>;
};

const info = { requestDate: '2027-01-15T08:00:00Z', entitlements: { verification: 'VERIFIED' } };
const localizedProduct = {
  identifier: validationConfig.productId,
  title: 'Exonération',
  priceString: '1,99 €',
};

export function revenueCatFake(script: RevenueCatScript = {}) {
  const listeners = new Set<(info: RevenueCatInfo) => void>();
  const configurations: string[] = [];
  const checkouts: string[] = [];
  const transfers: string[] = [];
  const appUserId = script.appUserId ?? '$RCAnonymousID:test';
  const sdk: RevenueCatSdk = {
    isConfigured: () => Promise.resolve(false),
    configure: (key) => {
      configurations.push(key);
    },
    getAppUserID: () => Promise.resolve(appUserId),
    restorePurchases: () => {
      transfers.push(appUserId);
      return script.restorePurchases?.() ?? Promise.resolve();
    },
    getProducts: () => Promise.resolve([localizedProduct]),
    purchase: (productId) => {
      checkouts.push(productId);
      return script.purchase?.(productId) ?? Promise.resolve({ status: 'purchased', productId });
    },
    requestRefund: () => Promise.resolve('requested'),
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
    checkouts,
    transfers,
    listeners,
    emit: () => listeners.forEach((listener) => listener(info)),
  };
}

export const storeKitPurchase = {
  originalId: '2000000123456789',
  productId: validationConfig.productId,
  productType: 'nonConsumable',
  appBundleId: validationConfig.appId,
  environment: 'sandbox',
  ownershipType: 'purchased',
  signedDateMs: 1_799_999_000_000,
  verified: true,
} as const;

type StoreKitScript = {
  entitlements?: readonly StoreKitTransaction[];
  latest?: StoreKitTransaction;
  sync?: () => Promise<void>;
};

export function storeKitFake(script: StoreKitScript = {}) {
  const listeners = new Set<() => void>();
  const state = { syncs: 0, script };
  const evidence: StoreKitEvidence = {
    entitlements: () => Promise.resolve(state.script.entitlements ?? []),
    latest: () => Promise.resolve(state.script.latest),
    sync: () => {
      state.syncs += 1;
      return state.script.sync?.() ?? Promise.resolve();
    },
    addUpdatesListener: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return {
    ...evidence,
    listeners,
    syncs: () => state.syncs,
    change: (next: StoreKitScript) => {
      state.script = next;
      for (const listener of listeners) listener();
    },
    changeWithoutUpdate: (next: StoreKitScript) => {
      state.script = next;
    },
  };
}
