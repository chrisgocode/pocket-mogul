import { z } from 'zod';

import { STOCK_MIXES } from '@/domain/business/vendingRules';

const count = z.number().int().nonnegative();

const spot = z.object({ machines: count, mix: z.enum(STOCK_MIXES), stock: count });

export const savedVending = z.discriminatedUnion('status', [
  z.object({ status: z.literal('inactive') }),
  z.object({
    status: z.literal('active'),
    spots: z.object({ office: spot, gym: spot, school: spot, station: spot, hospital: spot }),
    cardReaders: z.enum(['none', 'installed']),
  }),
]);
