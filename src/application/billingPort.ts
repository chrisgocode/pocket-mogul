import type { PurchaseIdentity } from './purchaseLedger';
export type PurchaseScope = {
  readonly store: 'apple' | 'google';
  readonly appId: string;
  readonly environment: 'sandbox' | 'production';
};

export type PurchaseReference = PurchaseScope & {
  readonly purchaseId: string;
  readonly productId: string;
};

export type ProductMetadata = {
  readonly productId: string;
  readonly displayName: string;
  readonly displayPrice: string;
};

export type VerifiedOwnership = {
  readonly reference: PurchaseReference;
  readonly productClass: 'nonConsumable' | 'consumable' | 'subscription';
  readonly verification: {
    readonly source: 'store' | 'provider';
    readonly verifiedAtMs: number;
  };
  readonly completion:
    | { readonly owner: 'provider' }
    | { readonly owner: 'application'; readonly action: 'finish' | 'consume' };
};

export type BillingUnavailable = { readonly status: 'disabled' | 'unavailable' };

export type OwnershipResult =
  | BillingUnavailable
  | { readonly status: 'verificationFailed' }
  | {
      readonly status: 'current';
      readonly authority: 'authoritative' | 'cached';
      readonly coverage: 'complete' | 'incomplete';
      readonly observedAtMs: number;
      readonly ownership: readonly VerifiedOwnership[];
      readonly removals: readonly PurchaseReference[];
    };

export type PurchaseResult =
  | BillingUnavailable
  | { readonly status: 'cancelled' | 'declined' | 'verificationFailed' }
  | { readonly status: 'pending'; readonly productId: string }
  | { readonly status: 'completed'; readonly ownership: VerifiedOwnership };

export type DeliveryResult = { readonly status: 'delivered' } | { readonly status: 'saveFailed' };

export type BillingEvent = { readonly type: 'ownershipChanged' };

export type BillingPort = {
  readonly initialize: (
    identity?: PurchaseIdentity,
  ) => Promise<
    BillingUnavailable | { readonly status: 'ready'; readonly providerReference?: string }
  >;
  readonly subscribe: (listener: (event: BillingEvent) => void) => () => void;
  readonly dispose: () => void;
  readonly products: () => Promise<
    (BillingUnavailable | { readonly status: 'available' }) & {
      readonly products: readonly ProductMetadata[];
    }
  >;
  readonly purchase: (productId: string) => Promise<PurchaseResult>;
  readonly currentOwnership: () => Promise<OwnershipResult>;
  readonly restore: () => Promise<OwnershipResult>;
  readonly completion:
    | { readonly owner: 'provider' }
    | {
        readonly owner: 'application';
        readonly complete: (
          ownership: VerifiedOwnership,
        ) => Promise<BillingUnavailable | { readonly status: 'completed' | 'alreadyCompleted' }>;
      };
};
