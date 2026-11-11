export type StoreKitTransaction = {
  readonly originalId: string;
  readonly productId: string;
  readonly productType: string;
  readonly appBundleId: string;
  readonly environment: string;
  readonly ownershipType: string;
  readonly signedDateMs: number;
  readonly revocationDateMs?: number | undefined;
  readonly verified: boolean;
};

export type StoreKitEvidence = {
  readonly entitlements: () => Promise<readonly StoreKitTransaction[]>;
  readonly latest: (productId: string) => Promise<StoreKitTransaction | undefined>;
  readonly sync: () => Promise<void>;
  readonly addUpdatesListener: (listener: () => void) => () => void;
};
