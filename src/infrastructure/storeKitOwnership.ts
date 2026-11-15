import type {
  OwnershipResult,
  PurchaseReference,
  PurchaseRemoval,
  PurchaseResult,
  VerifiedOwnership,
} from '@/application/billingPort';
import type { Clock } from '@/application/ports';
import type { RevenueCatConfig } from './revenueCatConfig';
import type { StoreKitEvidence, StoreKitTransaction } from './storeKitEvidence';

type Source = {
  readonly storeKit: () => Promise<StoreKitEvidence>;
  readonly config: RevenueCatConfig;
  readonly clock: Pick<Clock, 'wallMs'>;
};

type Observation = {
  readonly observedAtMs: number;
  readonly entitlements: readonly StoreKitTransaction[];
  readonly latest: readonly StoreKitTransaction[];
};

export async function syncedStoreKitOwnership(source: Source): Promise<OwnershipResult> {
  try {
    const storeKit = await source.storeKit();
    const observedAtMs = source.clock.wallMs();
    await storeKit.sync();
    const [entitlements, latest] = await Promise.all([
      storeKit.entitlements(),
      Promise.all(source.config.productIds.map((productId) => latestOf(storeKit, productId))),
    ]);
    return inventory(source.config, { observedAtMs, entitlements, latest: latest.flat() });
  } catch {
    return { status: 'unavailable' };
  }
}

async function latestOf(
  storeKit: StoreKitEvidence,
  productId: string,
): Promise<readonly StoreKitTransaction[]> {
  const record = await storeKit.latest(productId);
  return record?.productId === productId ? [record] : [];
}

export async function signedStoreKitOwnership(
  source: Omit<Source, 'clock'>,
): Promise<OwnershipResult> {
  try {
    const entitlements = await (await source.storeKit()).entitlements();
    if (entitlements.some((record) => !record.verified)) return { status: 'verificationFailed' };
    return {
      status: 'signed',
      ownership: ownedOwnership(source.config, entitlements),
    };
  } catch {
    return { status: 'unavailable' };
  }
}

export async function confirmedStoreKitPurchase(
  source: Omit<Source, 'clock'>,
  productId: string,
): Promise<PurchaseResult> {
  try {
    const latest = await (await source.storeKit()).latest(productId);
    if (latest === undefined) return { status: 'unavailable' };
    return confirmed(source.config, { latest, productId });
  } catch {
    return { status: 'unavailable' };
  }
}

function confirmed(
  config: RevenueCatConfig,
  purchase: { readonly latest: StoreKitTransaction; readonly productId: string },
): PurchaseResult {
  const { latest, productId } = purchase;
  const owned =
    latest.verified &&
    latest.productId === productId &&
    inScope(config, latest) &&
    latest.revocationDateMs === undefined;
  return owned
    ? { status: 'completed', ownership: verifiedOwnership(config, latest) }
    : { status: 'verificationFailed' };
}

function inventory(config: RevenueCatConfig, observation: Observation): OwnershipResult {
  const { entitlements, latest, observedAtMs } = observation;
  const records = [...entitlements, ...latest];
  if (records.some((record) => !record.verified)) return { status: 'verificationFailed' };
  return {
    status: 'current',
    authority: 'authoritative',
    coverage: 'complete',
    observedAtMs,
    ownership: ownedOwnership(config, entitlements),
    removals: removals(config, latest),
  };
}

function removals(
  config: RevenueCatConfig,
  latest: readonly StoreKitTransaction[],
): PurchaseRemoval[] {
  return latest.flatMap((record) =>
    record.revocationDateMs === undefined || !inScope(config, record)
      ? []
      : [{ ...reference(config, record), revokedAtMs: record.revocationDateMs }],
  );
}

function ownedOwnership(
  config: RevenueCatConfig,
  entitlements: readonly StoreKitTransaction[],
): VerifiedOwnership[] {
  return entitlements
    .filter((record) => inScope(config, record) && record.revocationDateMs === undefined)
    .map((record) => verifiedOwnership(config, record));
}

function inScope(config: RevenueCatConfig, record: StoreKitTransaction): boolean {
  return (
    config.store === 'apple' &&
    record.appBundleId === config.appId &&
    record.environment === config.environment &&
    record.productType === 'nonConsumable' &&
    record.ownershipType === 'purchased' &&
    record.originalId.length > 0
  );
}

function reference(config: RevenueCatConfig, record: StoreKitTransaction): PurchaseReference {
  return {
    store: 'apple',
    appId: config.appId,
    environment: config.environment,
    purchaseId: record.originalId,
    productId: record.productId,
  };
}

function verifiedOwnership(
  config: RevenueCatConfig,
  record: StoreKitTransaction,
): VerifiedOwnership {
  return {
    reference: reference(config, record),
    productClass: 'nonConsumable',
    verification: { source: 'store', verifiedAtMs: record.signedDateMs },
    completion: { owner: 'provider' },
  };
}
