import { z } from 'zod';

import { PRICE_LEVELS } from '@/domain/business/definition';
import { SEASONS } from '@/domain/business/hotelRules';

const rate = z.enum(PRICE_LEVELS);

export const savedHotel = z.discriminatedUnion('status', [
  z.object({ status: z.literal('inactive') }),
  z.object({
    status: z.literal('active'),
    season: z.enum(SEASONS),
    rates: z.object({ low: rate, shoulder: rate, high: rate, event: rate }),
    conference: z.enum(['none', 'installed']),
  }),
]);
