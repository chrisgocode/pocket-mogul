import type { BillingPort, DeliveryResult, OwnershipResult, PurchaseResult } from './billingPort';
import type { PurchaseOperationState } from './purchaseOperationState';
import type { CheckoutGuard } from './purchaseGuard';
export type CheckoutResult = PurchaseResult | DeliveryResult;
export type RestoreResult = OwnershipResult | { status: 'saveFailed' };

export type PurchaseDriver = {
  readonly products: BillingPort['products'];
  readonly dispose: () => void;
  readonly purchase: (productId: string) => Promise<CheckoutResult>;
  readonly restore: () => Promise<RestoreResult>;
  readonly recover: () => Promise<RestoreResult | undefined>;
};

export type GamePurchases = Omit<PurchaseDriver, 'recover'> & {
  readonly getState: () => PurchaseOperationState;
  readonly recover: () => Promise<void>;
};

export type Workflow = {
  state: PurchaseOperationState;
  reconciliation: 'idle' | 'querying' | 'changed';
  blocked: CheckoutGuard | undefined;
  purchase: Promise<CheckoutResult> | undefined;
  recovery: Promise<void> | undefined;
  restoration: Promise<RestoreResult> | undefined;
};
