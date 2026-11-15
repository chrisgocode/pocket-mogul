import { z } from 'zod';

const storeFields = {
  store: z.enum(['apple', 'google']),
  appId: z.literal('com.chrisgocode.pocketfortune'),
  apiKey: z.string().regex(/^(appl|goog)_[A-Za-z0-9]+$/),
};

const validationSchema = z
  .object({
    profile: z.literal('revenuecat-validation'),
    environment: z.literal('sandbox'),
    ...storeFields,
    productId: z.string().min(1).optional(),
    entitlementId: z.string().min(1).optional(),
    checkout: z.literal('sandbox').optional(),
  })
  .strict();

const releaseSchema = z
  .object({
    profile: z.literal('release'),
    ...storeFields,
  })
  .strict();

const configSchema = z.discriminatedUnion('profile', [validationSchema, releaseSchema]);

type Parsed = z.infer<typeof configSchema>;

export type StoreEnvironment = 'sandbox' | 'production';

const RELEASE_ENVIRONMENTS: readonly StoreEnvironment[] = ['production', 'sandbox'];
const VALIDATION_ENVIRONMENTS: readonly StoreEnvironment[] = ['sandbox'];

export type RevenueCatConfig = Pick<Parsed, 'profile' | 'store' | 'appId' | 'apiKey'> & {
  readonly environments: readonly StoreEnvironment[];
  readonly checkout: 'enabled' | 'disabled';
  readonly productIds: readonly string[];
  readonly validationProductId: string;
};

type Source = { readonly platform: string; readonly productIds: readonly string[] };

export function readRevenueCatConfig(input: unknown, source: Source): RevenueCatConfig | undefined {
  const parsed = configSchema.safeParse(input);
  if (!parsed.success || !matchesPlatform(parsed.data, source.platform)) return undefined;
  const { profile, store, appId, apiKey } = parsed.data;
  const shared = { profile, store, appId, apiKey, productIds: source.productIds };
  return parsed.data.profile === 'release'
    ? releaseConfig(shared)
    : validationConfig(shared, parsed.data);
}

type Shared = Omit<RevenueCatConfig, 'environments' | 'checkout' | 'validationProductId'>;

function validationConfig(
  shared: Shared,
  parsed: z.infer<typeof validationSchema>,
): RevenueCatConfig | undefined {
  const { productId, entitlementId, checkout } = parsed;
  const validationProductId = productId ?? shared.productIds.at(0);
  const named = [validationProductId, entitlementId ?? validationProductId];
  if (validationProductId === undefined || !named.every((id) => inCatalogue(shared, id)))
    return undefined;
  return {
    ...shared,
    environments: VALIDATION_ENVIRONMENTS,
    checkout: checkout === 'sandbox' ? 'enabled' : 'disabled',
    validationProductId,
  };
}

function releaseConfig(shared: Shared): RevenueCatConfig | undefined {
  const validationProductId = shared.productIds.at(0);
  if (validationProductId === undefined) return undefined;
  return {
    ...shared,
    environments: RELEASE_ENVIRONMENTS,
    checkout: 'enabled',
    validationProductId,
  };
}

function inCatalogue(source: Pick<Source, 'productIds'>, id: string | undefined): boolean {
  return id !== undefined && source.productIds.includes(id);
}

function matchesPlatform(config: Parsed, platform: string): boolean {
  if (platform !== 'ios' && platform !== 'android') return false;
  const expected = platform === 'ios' ? 'apple' : 'google';
  const keyPrefix = config.store === 'apple' ? 'appl_' : 'goog_';
  return config.store === expected && config.apiKey.startsWith(keyPrefix);
}
