import type { BillingPort, OwnershipResult, PurchaseResult } from '@/application/billingPort';
import type { PurchasePolicy } from '@/application/purchaseLedger';
import { disabledBilling } from './disabledBilling';
import { readRevenueCatConfig } from './revenueCatConfig';
import type { RevenueCatConfig } from './revenueCatConfig';
import type { RevenueCatInfo, RevenueCatSdk } from './revenueCatRuntime';
import type { StoreKitEvidence } from './storeKitEvidence';
import { confirmedStoreKitPurchase, syncedStoreKitOwnership } from './storeKitOwnership';
import { checkoutFailure } from './revenueCatPurchase';
import { storeKitReport, type StoreKitReport } from './storeKitReport';
import type { Clock } from '@/application/ports';

export type BillingValidation = {
  readonly productId: string;
  readonly checkout: 'sandbox' | 'disabled';
  readonly storeKit: () => Promise<StoreKitReport>;
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
  return {
    billing: validationBilling(config, options),
    validation: billingValidation(config, options.storeKit),
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
  storeKit: StoreKitSource | undefined,
): BillingValidation {
  return {
    productId: config.productId,
    checkout: checkoutEnabled(config, storeKit) ? 'sandbox' : 'disabled',
    storeKit: () =>
      storeKit === undefined
        ? Promise.resolve({ status: 'unavailable' })
        : storeKitReport({ storeKit: storeKit.evidence, config }),
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
};

function billingSession(config: RevenueCatConfig, options: Options): BillingSession {
  let session: Session = { status: 'idle' };
  const listeners = new Set<(event: { type: 'ownershipChanged' }) => void>();
  const changed = () => {
    for (const listener of listeners) listener({ type: 'ownershipChanged' });
  };
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
    initialize: async (identity) => {
      if (session.status === 'disposed') return { status: 'unavailable' };
      session =
        session.status === 'idle'
          ? { status: 'starting', ready: start(identity?.providerReference) }
          : session;
      return readyIdentity(sdk);
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose: () => {
      void started()
        .then((running) => stopListening(running, changed))
        .catch(() => undefined);
      session = { status: 'disposed' };
      listeners.clear();
    },
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

function validationBilling(config: RevenueCatConfig, options: Options): BillingPort {
  const { sdk, ...session } = billingSession(config, options);
  const { storeKit } = options;
  return {
    ...disabledBilling(),
    ...session,
    products: () => localizedProducts(sdk, config.productId),
    ...(storeKit !== undefined && checkoutEnabled(config, storeKit)
      ? { purchase: (productId: string) => checkout({ sdk, storeKit, config }, productId) }
      : {}),
    currentOwnership: () => readOwnership(sdk),
    restore: () =>
      storeKit === undefined
        ? readOwnership(sdk)
        : sdk().then(() =>
            syncedStoreKitOwnership({ storeKit: storeKit.evidence, config, clock: storeKit.clock }),
          ),
  };
}

type Checkout = {
  readonly sdk: () => Promise<RevenueCatSdk>;
  readonly storeKit: StoreKitSource;
  readonly config: RevenueCatConfig;
};

async function checkout(source: Checkout, productId: string): Promise<PurchaseResult> {
  if (productId !== source.config.productId) return { status: 'disabled' };
  const confirm = () =>
    confirmedStoreKitPurchase({ storeKit: source.storeKit.evidence, config: source.config });
  try {
    const outcome = await (await source.sdk()).purchase(productId);
    if (outcome.status === 'purchased')
      return outcome.productId === productId ? confirm() : { status: 'verificationFailed' };
    const failure = checkoutFailure(outcome.error);
    if (failure === 'alreadyOwned') return await confirm();
    return failure === 'pending' ? { status: 'pending', productId } : { status: failure };
  } catch {
    return { status: 'unavailable' };
  }
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
