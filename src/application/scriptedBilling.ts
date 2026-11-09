import type {
  BillingEvent,
  BillingPort,
  OwnershipResult,
  ProductMetadata,
  PurchaseResult,
  VerifiedOwnership,
} from './billingPort';

type Response<T> = T | Promise<T>;

type BillingScript = {
  readonly initialize?: Response<Awaited<ReturnType<BillingPort['initialize']>>>;
  readonly products?: readonly ProductMetadata[];
  readonly purchases?: readonly Response<PurchaseResult>[];
  readonly ownership?: readonly Response<OwnershipResult>[];
  readonly restores?: readonly Response<OwnershipResult>[];
  readonly completions?: readonly Response<{
    readonly status: 'completed' | 'alreadyCompleted' | 'unavailable';
  }>[];
  readonly completionOwner?: 'application' | 'provider';
};

export function scriptedBilling(script: BillingScript = {}) {
  const listeners = new Set<(event: BillingEvent) => void>();
  const purchases = [...(script.purchases ?? [])];
  const ownership = [...(script.ownership ?? [])];
  const restores = [...(script.restores ?? [])];
  const operations: string[] = [];
  const completions: VerifiedOwnership[] = [];
  const responses = [...(script.completions ?? [])];
  const observe = <T>(operation: string, response: Response<T>) => {
    operations.push(operation);
    return Promise.resolve(response);
  };
  const port: BillingPort = {
    initialize: () => observe('initialize', script.initialize ?? { status: 'ready' }),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose: () => listeners.clear(),
    products: () => observe('products', { status: 'available', products: script.products ?? [] }),
    purchase: (productId) =>
      observe(`purchase:${productId}`, purchases.shift() ?? { status: 'unavailable' }),
    currentOwnership: () => observe('ownership', ownership.shift() ?? { status: 'unavailable' }),
    restore: () => observe('restore', restores.shift() ?? { status: 'unavailable' }),
    completion: completion({ script, completions, observe, responses }),
  };
  return {
    ...port,
    operations,
    completions,
    emit: (event: BillingEvent) => {
      for (const listener of listeners) listener(event);
    },
  };
}

function completion(context: {
  responses: Response<{ readonly status: 'completed' | 'alreadyCompleted' | 'unavailable' }>[];
  script: BillingScript;
  completions: VerifiedOwnership[];
  observe: <T>(operation: string, response: Response<T>) => Promise<T>;
}): BillingPort['completion'] {
  if (context.script.completionOwner !== 'application') return { owner: 'provider' };
  return {
    owner: 'application',
    complete: (ownership) => {
      context.completions.push(ownership);
      return context.observe('complete', context.responses.shift() ?? { status: 'completed' });
    },
  };
}
