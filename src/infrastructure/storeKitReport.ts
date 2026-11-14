import type { StoreKitEvidence, StoreKitTransaction } from './storeKitEvidence';

const VISIBLE_ID_CHARACTERS = 4;

type Revocation =
  | { readonly revocation: 'none' }
  | { readonly revocation: 'revoked'; readonly revokedAtMs: number };

export type StoreKitReport =
  | { readonly status: 'unavailable' | 'none' }
  | (Revocation & {
      readonly status: 'read';
      readonly originalId: string;
      readonly appBundleId: string;
      readonly environment: string;
      readonly productType: string;
      readonly ownershipType: string;
      readonly signature: 'verified' | 'unverified';
      readonly entitlement: 'current' | 'absent';
    });

type Source = {
  readonly storeKit: () => Promise<StoreKitEvidence>;
  readonly productId: string;
};

export async function storeKitReport(source: Source): Promise<StoreKitReport> {
  try {
    const storeKit = await source.storeKit();
    const { productId } = source;
    const [latest, entitlements] = await Promise.all([
      storeKit.latest(productId),
      storeKit.entitlements(),
    ]);
    if (latest === undefined) return { status: 'none' };
    const current = entitlements.some((record) => record.productId === productId);
    return redacted(latest, current ? 'current' : 'absent');
  } catch {
    return { status: 'unavailable' };
  }
}

function redacted(record: StoreKitTransaction, entitlement: 'current' | 'absent'): StoreKitReport {
  return {
    status: 'read',
    originalId: `…${record.originalId.slice(-VISIBLE_ID_CHARACTERS)}`,
    appBundleId: record.appBundleId,
    environment: record.environment,
    productType: record.productType,
    ownershipType: record.ownershipType,
    signature: record.verified ? 'verified' : 'unverified',
    ...revocation(record.revocationDateMs),
    entitlement,
  };
}

function revocation(revokedAtMs: number | undefined): Revocation {
  return revokedAtMs === undefined
    ? { revocation: 'none' }
    : { revocation: 'revoked', revokedAtMs };
}
