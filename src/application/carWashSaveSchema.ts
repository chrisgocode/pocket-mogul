import { z } from 'zod';

import { WEATHERS } from '@/domain/business/carWashRules';
import { PRICE_LEVELS } from '@/domain/business/definition';

const WHOLE_PERCENT = 100;
const count = z.number().int().nonnegative();
const offer = z.enum(['offered', 'withdrawn']);

export const savedCarWash = z.discriminatedUnion('status', [
  z.object({ status: z.literal('inactive') }),
  z.object({
    status: z.literal('active'),
    weather: z.enum(WEATHERS),
    packages: z.object({ deluxe: offer, ultimate: offer }),
    members: count,
    membershipLevel: z.enum(PRICE_LEVELS),
    memberCapPercent: z.number().int().min(0).max(WHOLE_PERCENT),
    detailing: z.enum(['none', 'installed']),
  }),
]);
