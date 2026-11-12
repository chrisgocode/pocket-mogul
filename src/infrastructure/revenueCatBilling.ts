import type { BillingEvent, BillingPort, OwnershipResult } from '@/application/billingPort';
import type { PurchasePolicy } from '@/application/purchaseLedger';
import { disabledBilling } from './disabledBilling';
import { readRevenueCatConfig } from './revenueCatConfig';
import type { RevenueCatConfig } from './revenueCatConfig';
import type { RefundRequest, RevenueCatInfo, RevenueCatSdk } from './revenueCatRuntime';
import type { StoreKitEvidence } from './storeKitEvidence';
import { signedStoreKitOwnership, syncedStoreKitOwnership } from './storeKitOwnership';
import { sheetCheckout, type CheckoutLog, type CheckoutTrace } from './revenueCatSheet';
import { storeKitReport, type StoreKitReport } from './storeKitReport';
import type { Clock } from '@/application/ports';

export type BillingValidation = {
  readonly productId: string;
  readonly checkout: 'sandbox' | 'disabled';
  readonly storeKit: () => Promise<StoreKitReport>;
  readonly lastCheckout: () => CheckoutTrace | undefined;
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
};

type StoreKitSource = {
  readonly evidence: () => Promise<StoreKitEvidence>;
  readonly clock: Pick<Clock, 'wallMs'>;
};

export function revenueCatBilling(options: Options): Selection {
  const config = readRevenueCatConfig(options.config, options.platform);
  if (config === undefined) return { billing: disabledBilling() };
  const trace: CheckoutLog = {};
  const billing = validationBilling(config, { ...options, trace });
  return {
    billing,
    validation: billingValidation(config, { options, trace }),
    purchasePolicy: {
      scopes: [{ store: config.store, appId: config.appId, environment: config.environment }],
      products: [
        {
          productId: config.productId,
          productClass: 'nonConsumable',
          benefit: 'taxExemption',
          ...(config.store === 'apple' ? { duplicateCharge: 'storePrevents' } : {}),
        },
      ],
    },
  };
}

function billingValidation(
  config: RevenueCatConfig,
  source: { readonly options: Options; readonly trace: CheckoutLog },
): BillingValidation {
  const { storeKit, runtime } = source.options;
  const enabled = checkoutEnabled(config, storeKit);
  return {
    productId: config.productId,
    checkout: enabled ? 'sandbox' : 'disabled',
    storeKit: () =>
      storeKit === undefined
        ? Promise.resolve({ status: 'unavailable' })
        : storeKitReport({ storeKit: storeKit.evidence, config }),
    lastCheckout: () => source.trace.last,
    requestRefund: async () => {
      if (!enabled) return 'disabled';
      try {
        return await (await runtime(config)).requestRefund(config.productId);
      } catch {
        return 'failed';
      }
    },
  };
}

function checkoutEnabled(config: RevenueCatConfig, storeKit: StoreKitSource | undefined): boolean {
  return config.checkout === 'sandbox' && config.store === 'apple' && storeKit !== undefined;
}

type Started = { readonly native: RevenueCatSdk; readonly stopUpdates: () => void };

type Session =
  | { readonly status: 'idle' | 'disposed' }
  | { readonly status: 'starting'; readonly ready: Promise<Started> };

type BillingSession = Pick<BillingPort, 'initialize' | 'subscribe' | 'dispose'> & {
  readonly sdk: () => Promise<RevenueCatSdk>;
  readonly requestReconciliation: () => void;
};

function billingSession(config: RevenueCatConfig, options: Options): BillingSession {
  let session: Session = { status: 'idle' };
  const listeners = ownershipListeners();
  const changed = listeners.notify;
  const started = () =>
    session.status === 'starting' ? session.ready : Promise.reject(new Error('Billing not ready'));
  const sdk = () => started().then(({ native }) => native);
  const start = async (reference?: string): Promise<Started> => {
    const native = await options.runtime(config);
    if (reference !== undefined && reference !== (await native.getAppUserID()))
      throw new Error('Billing identity mismatch');
    if (session.status === 'disposed') return { native, stopUpdates: () => undefined };
    native.addCustomerInfoUpdateListener(changed);
    return { native, stopUpdates: await storeKitUpdates(options, changed) };
  };
  return {
    sdk,
    requestReconciliation: changed,
    initialize: async (identity) => {
      if (session.status === 'disposed') return { status: 'unavailable' };
      session =
        session.status === 'idle'
          ? { status: 'starting', ready: start(identity?.providerReference) }
          : session;
      return readyIdentity(sdk);
    },
    subscribe: listeners.subscribe,
    dispose: () => {
      void started()
        .then((running) => stopListening(running, changed))
        .catch(() => undefined);
      session = { status: 'disposed' };
      listeners.clear();
    },
  };
}

function ownershipListeners() {
  const listeners = new Set<(event: BillingEvent) => void>();
  return {
    notify: () => {
      for (const listener of listeners) listener({ type: 'ownershipChanged' });
    },
    subscribe: (listener: (event: BillingEvent) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    clear: () => listeners.clear(),
  };
}

function stopListening(running: Started, changed: () => void): void {
  running.native.removeCustomerInfoUpdateListener(changed);
  running.stopUpdates();
}

async function storeKitUpdates(options: Options, changed: () => void): Promise<() => void> {
  if (options.storeKit === undefined) return () => undefined;
  try {
    return (await options.storeKit.evidence()).addUpdatesListener(changed);
  } catch {
    return () => undefined;
  }
}

function validationBilling(
  config: RevenueCatConfig,
  options: Options & { readonly trace: CheckoutLog },
): BillingPort {
  const { sdk, requestReconciliation, ...session } = billingSession(config, options);
  const { storeKit } = options;
  return {
    ...disabledBilling(),
    ...session,
    products: () => localizedProducts(sdk, config.productId),
    ...(storeKit !== undefined && checkoutEnabled(config, storeKit)
      ? {
          purchase: sheetCheckout({
            sdk,
            storeKit: storeKit.evidence,
            config,
            trace: options.trace,
            settled: requestReconciliation,
          }),
        }
      : {}),
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
        : sdk().then(() =>
            syncedStoreKitOwnership({ storeKit: storeKit.evidence, config, clock: storeKit.clock }),
          ),
  };
}

async function localizedProducts(
  sdk: () => Promise<RevenueCatSdk>,
  productId: string,
): ReturnType<BillingPort['products']> {
  try {
    const products = await (await sdk()).getProducts([productId]);
    return {
      status: 'available',
      products: products
        .filter((product) => product.identifier === productId)
        .map((product) => ({
          productId: product.identifier,
          displayName: product.title,
          displayPrice: product.priceString,
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

async function readyIdentity(sdk: BillingSession['sdk']): ReturnType<BillingPort['initialize']> {
  try {
    return { status: 'ready', providerReference: await (await sdk()).getAppUserID() };
  } catch {
    return { status: 'unavailable' };
  }
}
