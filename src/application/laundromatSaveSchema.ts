import { z } from 'zod';

const WHOLE_PERCENT = 100;

export const savedLaundromat = z.discriminatedUnion('status', [
  z.object({ status: z.literal('inactive') }),
  z.object({
    status: z.literal('active'),
    jumboPercent: z.number().int().min(0).max(WHOLE_PERCENT),
    serviceLevel: z.number().int().nonnegative(),
    pickup: z.enum(['none', 'installed']),
  }),
]);
