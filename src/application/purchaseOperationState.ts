export type PurchaseOperationState =
  | {
      readonly status:
        | 'disabled'
        | 'initializing'
        | 'ready'
        | 'reconciling'
        | 'unavailable'
        | 'disposed';
    }
  | { readonly status: 'purchasing' | 'pending' | 'interrupted'; readonly productId: string }
  | {
      readonly status: 'failed';
      readonly reason: 'declined' | 'verificationFailed' | 'saveFailed';
    };
