import type { CustomerInfo } from 'react-native-purchases';
import type { RevenueCatConfig } from './revenueCatConfig';
import type { RevenueCatErrorName } from './revenueCatPurchase';

export type RevenueCatInfo = Pick<CustomerInfo, 'requestDate'> & {
  readonly entitlements: { readonly verification: string };
};

export type RevenueCatPurchase =
  | { readonly status: 'purchased'; readonly productId: string }
  | { readonly status: 'failed'; readonly error: RevenueCatErrorName | 'unknown' };

export type RefundRequest = 'requested' | 'cancelled' | 'failed';

export type RevenueCatSdk = {
  readonly isConfigured: () => Promise<boolean>;
  readonly configure: (apiKey: string) => void;
  readonly getAppUserID: () => Promise<string>;
  readonly getProducts: (ids: string[]) => Promise<
    readonly {
      readonly identifier: string;
      readonly title: string;
      readonly priceString: string;
    }[]
  >;
  readonly purchase: (productId: string) => Promise<RevenueCatPurchase>;
  readonly requestRefund: (productId: string) => Promise<RefundRequest>;
  readonly getCustomerInfo: () => Promise<RevenueCatInfo>;
  readonly addCustomerInfoUpdateListener: (listener: (info: RevenueCatInfo) => void) => void;
  readonly removeCustomerInfoUpdateListener: (listener: (info: RevenueCatInfo) => void) => void;
};

type Session = { readonly key: string; readonly sdk: Promise<RevenueCatSdk> };

export function revenueCatRuntime(load: () => Promise<RevenueCatSdk>) {
  let session: Session | undefined;
  return (config: RevenueCatConfig): Promise<RevenueCatSdk> => {
    const key = JSON.stringify(config);
    session ??= { key, sdk: configureSdk(load, config) };
    if (session.key !== key) return Promise.reject(new Error('Billing configuration conflict'));
    return session.sdk;
  };
}

async function configureSdk(load: () => Promise<RevenueCatSdk>, config: RevenueCatConfig) {
  const sdk = await load();
  if (await sdk.isConfigured()) throw new Error('Billing configuration is externally owned');
  sdk.configure(config.apiKey);
  return sdk;
}
