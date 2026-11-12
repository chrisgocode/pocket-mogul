import type {
  OwnershipResult,
  PurchaseReference,
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
  readonly latest: StoreKitTransaction | undefined;
};

export async function syncedStoreKitOwnership(source: Source): Promise<OwnershipResult> {
  try {
    const storeKit = await source.storeKit();
    const observedAtMs = source.clock.wallMs();
    await storeKit.sync();
    const [entitlements, latest] = await Promise.all([
      storeKit.entitlements(),
      storeKit.latest(source.config.productId),
    ]);
    return inventory(source.config, { observedAtMs, entitlements, latest });
  } catch {
    return { status: 'unavailable' };
  }
}

export async function confirmedStoreKitPurchase(
  source: Omit<Source, 'clock'>,
): Promise<PurchaseResult> {
  try {
    const latest = await (await source.storeKit()).latest(source.config.productId);
    if (latest === undefined) return { status: 'unavailable' };
    return confirmed(source.config, latest);
  } catch {
    return { status: 'unavailable' };
  }
}

function confirmed(config: RevenueCatConfig, latest: StoreKitTransaction): PurchaseResult {
  const owned =
    latest.verified &&
    latest.productId === config.productId &&
    inScope(config, latest) &&
    latest.revocationDateMs === undefined;
  return owned
    ? { status: 'completed', ownership: verifiedOwnership(config, latest) }
    : { status: 'verificationFailed' };
}

function inventory(config: RevenueCatConfig, observation: Observation): OwnershipResult {
  const { entitlements, latest, observedAtMs } = observation;
  const records = latest === undefined ? entitlements : [...entitlements, latest];
  if (records.some((record) => !record.verified)) return { status: 'verificationFailed' };
  const owned = entitlements.filter(
    (record) => inScope(config, record) && record.revocationDateMs === undefined,
  );
  const revoked =
    latest !== undefined && inScope(config, latest) && latest.revocationDateMs !== undefined;
  return {
    status: 'current',
    authority: 'authoritative',
    coverage: 'complete',
    observedAtMs,
    ownership: owned.map((record) => verifiedOwnership(config, record)),
    removals: revoked ? [reference(config, latest)] : [],
  };
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
