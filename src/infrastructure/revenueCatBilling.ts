import type { BillingPort, OwnershipResult } from '@/application/billingPort';
import { PURCHASE_CATALOGUE } from '@/application/purchaseCatalogue';
import type { CatalogueProduct, PurchasePolicy } from '@/application/purchaseLedger';
import { disabledBilling } from './disabledBilling';
import { readRevenueCatConfig } from './revenueCatConfig';
import type { RevenueCatConfig } from './revenueCatConfig';
import type { RefundRequest, RevenueCatInfo, RevenueCatSdk } from './revenueCatRuntime';
import { billingSession, type ProviderLog, type ProviderTrace } from './revenueCatSession';
import type { StoreKitEvidence } from './storeKitEvidence';
import { signedStoreKitOwnership, syncedStoreKitOwnership } from './storeKitOwnership';
import {
  sheetCheckout,
  type CheckoutLog,
  type CheckoutTrace,
  type SheetCheckout,
} from './revenueCatSheet';
import { storeKitReport, type StoreKitReport } from './storeKitReport';
import type { Clock } from '@/application/ports';

export type BillingValidation = {
  readonly productId: string;
  readonly checkout: 'sandbox' | 'disabled';
  readonly storeKit: () => Promise<StoreKitReport>;
  readonly lastCheckout: () => CheckoutTrace | undefined;
  readonly provider: () => ProviderTrace;
  readonly requestRefund: () => Promise<RefundRequest | 'disabled'>;
};

type Selection = {
  readonly billing: BillingPort;
  readonly purchasePolicy?: PurchasePolicy;
  readonly validation?: BillingValidation;
};

type Options = {
  readonly config: unknown;
  readonly platform: string;
  readonly runtime: (config: RevenueCatConfig) => Promise<RevenueCatSdk>;
  readonly storeKit?: StoreKitSource;
  readonly catalogue?: readonly CatalogueProduct[];
};

type StoreKitSource = {
  readonly evidence: () => Promise<StoreKitEvidence>;
  readonly clock: Pick<Clock, 'wallMs'>;
};

export function revenueCatBilling(options: Options): Selection {
  const catalogue = options.catalogue ?? PURCHASE_CATALOGUE;
  const config = readRevenueCatConfig(options.config, {
    platform: options.platform,
    productIds: catalogue.map((product) => product.productId),
  });
  if (config === undefined) return { billing: disabledBilling() };
  const logs: Logs = { trace: {}, provider: { identity: 'unknown', transfer: 'notRequested' } };
  const billing = validationBilling(config, { ...options, ...logs });
  return {
    billing,
    validation: billingValidation(config, { options, ...logs }),
    purchasePolicy: {
      scopes: [{ store: config.store, appId: config.appId, environment: config.environment }],
      products: catalogue.map((product) => policyProduct(product, config.store)),
    },
  };
}

function policyProduct(
  product: CatalogueProduct,
  store: RevenueCatConfig['store'],
): PurchasePolicy['products'][number] {
  const sold = { ...product, productClass: 'nonConsumable' } as const;
  return store === 'apple' ? { ...sold, duplicateCharge: 'storePrevents' } : sold;
}

type Logs = { readonly trace: CheckoutLog; readonly provider: ProviderLog };

function billingValidation(
  config: RevenueCatConfig,
  source: Logs & { readonly options: Options },
): BillingValidation {
  const { storeKit, runtime } = source.options;
  const enabled = checkoutEnabled(config, storeKit);
  return {
    productId: config.validationProductId,
    checkout: enabled ? 'sandbox' : 'disabled',
    storeKit: () =>
      storeKit === undefined
        ? Promise.resolve({ status: 'unavailable' })
        : storeKitReport({
            storeKit: storeKit.evidence,
            productId: config.validationProductId,
          }),
    lastCheckout: () => source.trace.last,
    provider: () => ({ ...source.provider }),
    requestRefund: async () => {
      if (!enabled) return 'disabled';
      try {
        return await (await runtime(config)).requestRefund(config.validationProductId);
      } catch {
        return 'failed';
      }
    },
  };
}

function checkoutEnabled(config: RevenueCatConfig, storeKit: StoreKitSource | undefined): boolean {
  return config.checkout === 'sandbox' && config.store === 'apple' && storeKit !== undefined;
}

function validationBilling(config: RevenueCatConfig, options: Options & Logs): BillingPort {
  const { sdk, requestReconciliation, active, ...session } = billingSession(config, options);
  const { storeKit } = options;
  const sheet =
    storeKit !== undefined && checkoutEnabled(config, storeKit)
      ? sheetCheckout({
          sdk,
          storeKit: storeKit.evidence,
          config,
          trace: options.trace,
          settled: requestReconciliation,
          process: options.runtime,
        })
      : undefined;
  return {
    ...disabledBilling(),
    ...session,
    products: () => localizedProducts(sdk, config.productIds),
    ...(sheet === undefined ? {} : { purchase: sheet.purchase }),
    currentOwnership: () =>
      storeKit === undefined
        ? readOwnership(sdk)
        : sdk().then(
            () => signedStoreKitOwnership({ storeKit: storeKit.evidence, config }),
            () => ({ status: 'unavailable' }) as const,
          ),
    restore: () =>
      storeKit === undefined
        ? readOwnership(sdk)
        : sdk().then(
            (native) =>
              syncedRestore({ storeKit, config, sheet, transfer: { native, active, ...options } }),
            () => ({ status: 'unavailable' }) as const,
          ),
  };
}

async function syncedRestore(source: {
  readonly storeKit: StoreKitSource;
  readonly config: RevenueCatConfig;
  readonly sheet: SheetCheckout | undefined;
  readonly transfer: Transfer;
}): Promise<OwnershipResult> {
  const openBefore = source.sheet?.pendingProductIds() ?? [];
  const result = await syncedStoreKitOwnership({
    storeKit: source.storeKit.evidence,
    config: source.config,
    clock: source.storeKit.clock,
  });
  if (result.status === 'current') void requestTransfer(source.transfer);
  const pending = [...new Set([...openBefore, ...(source.sheet?.pendingProductIds() ?? [])])];
  return result.status === 'current' && pending.length > 0
    ? { ...result, pendingProductIds: pending }
    : result;
}

type Transfer = {
  readonly native: RevenueCatSdk;
  readonly active: () => boolean;
  readonly provider: ProviderLog;
};

async function requestTransfer({ native, provider, active }: Transfer): Promise<void> {
  if (!active()) return;
  provider.transfer = 'requested';
  try {
    await native.restorePurchases();
    provider.transfer = 'completed';
  } catch {
    provider.transfer = 'failed';
  }
}

async function localizedProducts(
  sdk: () => Promise<RevenueCatSdk>,
  productIds: readonly string[],
): ReturnType<BillingPort['products']> {
  try {
    const products = await (await sdk()).getProducts([...productIds]);
    return {
      status: 'available',
      products: products
        .filter((product) => productIds.includes(product.identifier))
        .map((product) => ({
          productId: product.identifier,
          displayName: product.title,
          displayPrice: product.priceString,
          price: product.price,
        })),
    };
  } catch {
    return { status: 'unavailable', products: [] };
  }
}

async function readOwnership(sdk: () => Promise<RevenueCatSdk>): Promise<OwnershipResult> {
  try {
    return normalizeInfo(await (await sdk()).getCustomerInfo());
  } catch {
    return { status: 'unavailable' };
  }
}

function normalizeInfo(info: RevenueCatInfo): OwnershipResult {
  if (info.entitlements.verification === 'FAILED') return { status: 'verificationFailed' };
  const observedAtMs = Date.parse(info.requestDate);
  if (!Number.isFinite(observedAtMs)) return { status: 'unavailable' };
  return {
    status: 'current',
    authority: 'cached',
    coverage: 'incomplete',
    observedAtMs,
    ownership: [],
    removals: [],
  };
}
