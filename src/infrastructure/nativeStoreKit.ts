import { requireOptionalNativeModule, type EventSubscription } from 'expo';
import { z } from 'zod';
import type { StoreKitEvidence } from './storeKitEvidence';

type StoreKitModule = {
  readonly entitlements: () => Promise<unknown>;
  readonly latest: (productId: string) => Promise<unknown>;
  readonly sync: () => Promise<void>;
  readonly addListener: (event: 'onTransactionsChanged', listener: () => void) => EventSubscription;
};

const transaction = z
  .object({
    originalId: z.string(),
    productId: z.string(),
    productType: z.string(),
    appBundleId: z.string(),
    environment: z.string(),
    ownershipType: z.string(),
    signedDateMs: z.number(),
    revocationDateMs: z.number().optional(),
    verified: z.boolean(),
  })
  .strict();

export function nativeStoreKit(): Promise<StoreKitEvidence> {
  const native = requireOptionalNativeModule<StoreKitModule>('StoreKitEvidence');
  if (native === null) return Promise.reject(new Error('StoreKit evidence is unavailable'));
  return Promise.resolve({
    entitlements: async () => z.array(transaction).parse(await native.entitlements()),
    latest: async (productId) =>
      transaction.nullable().parse(await native.latest(productId)) ?? undefined,
    sync: () => native.sync(),
    addUpdatesListener: (listener) => {
      const subscription = native.addListener('onTransactionsChanged', listener);
      return () => subscription.remove();
    },
  });
}
