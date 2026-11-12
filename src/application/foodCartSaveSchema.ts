import { z } from 'zod';

import { CART_SPOTS, CROWDS } from '@/domain/business/foodCartRules';

const crowd = z.enum(CROWDS);
const offer = z.enum(['offered', 'withdrawn']);

export const savedFoodCart = z.discriminatedUnion('status', [
  z.object({ status: z.literal('inactive') }),
  z.object({
    status: z.literal('active'),
    spot: z.enum(CART_SPOTS),
    crowds: z.object({ park: crowd, offices: crowd, campus: crowd, market: crowd, stadium: crowd }),
    menu: z.object({ combo: offer, snacks: offer, express: offer }),
    secondWindow: z.enum(['none', 'installed']),
  }),
]);
