import type { BillingPort } from '@/application/billingPort';

export function disabledBilling(): BillingPort {
  return {
    initialize: () => Promise.resolve({ status: 'disabled' }),
    subscribe: () => () => {},
    dispose: () => {},
    products: () => Promise.resolve({ status: 'disabled', products: [] }),
    purchase: () => Promise.resolve({ status: 'disabled' }),
    currentOwnership: () => Promise.resolve({ status: 'disabled' }),
    restore: () => Promise.resolve({ status: 'disabled' }),
    completion: { owner: 'provider' },
  };
}
