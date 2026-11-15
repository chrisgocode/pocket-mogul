import { z } from 'zod';

const configSchema = z
  .object({
    profile: z.literal('revenuecat-validation'),
    environment: z.literal('sandbox'),
    store: z.enum(['apple', 'google']),
    appId: z.literal('com.chrisgocode.pocketfortune'),
    apiKey: z.string().regex(/^(appl|goog)_[A-Za-z0-9]+$/),
    productId: z.string().min(1).optional(),
    entitlementId: z.string().min(1).optional(),
    checkout: z.literal('sandbox').optional(),
  })
  .strict();

type Parsed = z.infer<typeof configSchema>;

export type RevenueCatConfig = Pick<
  Parsed,
  'profile' | 'environment' | 'store' | 'appId' | 'apiKey' | 'checkout'
> & {
  readonly productIds: readonly string[];
  readonly validationProductId: string;
};

type Source = { readonly platform: string; readonly productIds: readonly string[] };

export function readRevenueCatConfig(input: unknown, source: Source): RevenueCatConfig | undefined {
  const parsed = configSchema.safeParse(input);
  if (!parsed.success || !matchesPlatform(parsed.data, source.platform)) return undefined;
  const { productId, entitlementId, ...config } = parsed.data;
  const validationProductId = productId ?? source.productIds.at(0);
  const named = [validationProductId, entitlementId ?? validationProductId];
  if (validationProductId === undefined || !named.every((id) => inCatalogue(source, id)))
    return undefined;
  return { ...config, productIds: source.productIds, validationProductId };
}

function inCatalogue(source: Source, id: string | undefined): boolean {
  return id !== undefined && source.productIds.includes(id);
}

function matchesPlatform(config: Parsed, platform: string): boolean {
  if (platform !== 'ios' && platform !== 'android') return false;
  const expected = platform === 'ios' ? 'apple' : 'google';
  const keyPrefix = config.store === 'apple' ? 'appl_' : 'goog_';
  return config.store === expected && config.apiKey.startsWith(keyPrefix);
}
