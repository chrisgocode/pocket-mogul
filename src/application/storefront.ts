import { holdsEntitlement } from '@/domain/entitlements';
import type { GameState } from '@/domain/gameState';

import type { ProductMetadata } from './billingPort';
import type { CatalogueProduct, PurchasePolicy } from './purchaseLedger';
import type { CheckoutResult, GamePurchases, RestoreResult } from './purchaseOperationTypes';

export type StorefrontState = {
  readonly shelf:
    | { readonly status: 'loading' | 'unavailable' }
    | { readonly status: 'listed'; readonly products: readonly ProductMetadata[] };
  readonly activity:
    | { readonly status: 'idle' | 'restoring' }
    | { readonly status: 'buying'; readonly productId: string };
  readonly notice:
    | { readonly about: 'nothing' }
    | { readonly about: 'checkout' | 'restore'; readonly text: string };
};

export type Storefront = {
  readonly status: 'open' | 'closed';
  readonly catalogue: readonly CatalogueProduct[];
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => StorefrontState;
  readonly buy: (productId: string) => Promise<void>;
  readonly restore: () => Promise<void>;
};

type Source = {
  readonly policy: PurchasePolicy | undefined;
  readonly purchases: GamePurchases;
  readonly snapshots: { readonly get: () => { readonly state: GameState } };
};

const NO_NOTICE = { about: 'nothing' } as const;

export const STORE_UNREACHABLE = "The store can't be reached right now. Try again later.";

const CHECKOUT_MESSAGES: Record<CheckoutResult['status'], string | undefined> = {
  delivered: 'Purchased. Thank you!',
  completed: 'Purchased. Thank you!',
  cancelled: undefined,
  pending: 'Waiting for approval. It arrives as soon as the purchase is approved.',
  declined: 'The payment was declined. You were not charged.',
  verificationFailed: "The store couldn't verify this purchase. Try Restore purchases in Settings.",
  saveFailed: "The purchase went through but couldn't be saved. It arrives when the game reopens.",
  unavailable: STORE_UNREACHABLE,
  disabled: STORE_UNREACHABLE,
};

const RESTORE_FAILURES: Partial<Record<RestoreResult['status'], string>> = {
  verificationFailed: "The store couldn't verify your purchases. Try again later.",
  saveFailed: "Your purchases couldn't be saved. Try again.",
  unavailable: STORE_UNREACHABLE,
  disabled: STORE_UNREACHABLE,
};

export function ownsProduct(state: GameState, product: CatalogueProduct): boolean {
  return product.entitlements.every((entitlement) => holdsEntitlement(state, entitlement));
}

function restoreMessage(result: RestoreResult, source: Source): string {
  const failure = RESTORE_FAILURES[result.status];
  if (failure !== undefined) return failure;
  const owned = (source.policy?.products ?? []).some((product) =>
    ownsProduct(source.snapshots.get().state, product),
  );
  return owned ? 'Purchases restored.' : 'No purchases found for this store account.';
}

function observed(initial: StorefrontState) {
  const listeners = new Set<() => void>();
  let current = initial;
  return {
    listeners,
    get: () => current,
    change: (next: Partial<StorefrontState>) => {
      current = { ...current, ...next };
      for (const listener of listeners) listener();
    },
  };
}

async function stocked(purchases: GamePurchases): Promise<StorefrontState['shelf']> {
  const listing = await purchases.products();
  return listing.status === 'available'
    ? { status: 'listed', products: listing.products }
    : { status: 'unavailable' };
}

export function storefront(source: Source): Storefront {
  const { purchases } = source;
  const { listeners, get, change } = observed({
    shelf: { status: 'loading' },
    activity: { status: 'idle' },
    notice: NO_NOTICE,
  });
  const busy = () => get().activity.status !== 'idle';
  return {
    status: purchases.getState().status === 'disabled' ? 'closed' : 'open',
    catalogue: source.policy?.products ?? [],
    getSnapshot: get,
    subscribe: (listener) => {
      if (listeners.size === 0) void stocked(purchases).then((shelf) => change({ shelf }));
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    buy: async (productId) => {
      if (busy()) return;
      change({ activity: { status: 'buying', productId }, notice: NO_NOTICE });
      const text = CHECKOUT_MESSAGES[(await purchases.purchase(productId)).status];
      change({
        activity: { status: 'idle' },
        notice: text === undefined ? NO_NOTICE : { about: 'checkout', text },
      });
    },
    restore: async () => {
      if (busy()) return;
      change({ activity: { status: 'restoring' }, notice: NO_NOTICE });
      const result = await purchases.restore();
      change({
        activity: { status: 'idle' },
        notice: { about: 'restore', text: restoreMessage(result, source) },
      });
    },
  };
}
