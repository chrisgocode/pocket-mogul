import { z } from 'zod';

const configSchema = z
  .object({
    profile: z.literal('revenuecat-validation'),
    environment: z.literal('sandbox'),
    store: z.enum(['apple', 'google']),
    appId: z.literal('com.chrisgocode.pocketfortune'),
    apiKey: z.string().regex(/^(appl|goog)_[A-Za-z0-9]+$/),
    productId: z.string().regex(/^pm_validation_[a-z0-9_]+$/),
    entitlementId: z.string().regex(/^pm_validation_[a-z0-9_]+$/),
  })
  .strict();

export type RevenueCatConfig = z.infer<typeof configSchema>;

export function readRevenueCatConfig(
  input: unknown,
  platform: string,
): RevenueCatConfig | undefined {
  const parsed = configSchema.safeParse(input);
  if (!parsed.success) return undefined;
  const config = parsed.data;
  const expected = platform === 'ios' ? 'apple' : 'google';
  const keyPrefix = config.store === 'apple' ? 'appl_' : 'goog_';
  if (platform !== 'ios' && platform !== 'android') return undefined;
  return config.store === expected && config.apiKey.startsWith(keyPrefix) ? config : undefined;
}
