import type { PurchaseScope, VerifiedOwnership } from './billingPort';

export type PurchasePolicy = {
  readonly scopes: readonly PurchaseScope[];
  readonly products: readonly {
    readonly productId: string;
    readonly productClass: 'nonConsumable';
    readonly benefit: 'taxExemption';
  }[];
};

export type PurchaseRecord = {
  readonly ownership: VerifiedOwnership;
  readonly benefit: 'taxExemption';
  readonly result: { readonly status: 'delivered' };
  readonly completion: 'pending' | 'completed';
};

export function purchaseKey(reference: PurchaseScope & { readonly purchaseId: string }): string {
  return JSON.stringify([
    reference.store,
    reference.appId,
    reference.environment,
    reference.purchaseId,
  ]);
}

export function acceptsPurchase(policy: PurchasePolicy, ownership: VerifiedOwnership): boolean {
  const { reference, completion } = ownership;
  return (
    reference.purchaseId.length > 0 &&
    Number.isFinite(ownership.verification.verifiedAtMs) &&
    ownership.verification.source === 'store' &&
    ownership.productClass === 'nonConsumable' &&
    completion.owner === 'application' &&
    completion.action === 'finish' &&
    policy.scopes.some(
      (scope) =>
        scope.store === reference.store &&
        scope.appId === reference.appId &&
        scope.environment === reference.environment,
    ) &&
    policy.products.some(
      (product) =>
        product.productId === reference.productId &&
        product.productClass === ownership.productClass,
    )
  );
}

export type PurchaseIdentity = {
  readonly id: string;
  readonly providerReference?: string | undefined;
};
