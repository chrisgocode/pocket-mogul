import { z } from 'zod';

import { GYM_TIERS } from '@/domain/business/gymRules';

export const savedGym = z.discriminatedUnion('status', [
  z.object({ status: z.literal('inactive') }),
  z.object({
    status: z.literal('active'),
    members: z.number().int().nonnegative(),
    tier: z.enum(GYM_TIERS),
    classLevel: z.number().int().nonnegative(),
    allHours: z.enum(['none', 'installed']),
  }),
]);
