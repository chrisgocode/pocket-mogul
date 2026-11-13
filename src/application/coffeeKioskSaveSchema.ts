import { z } from 'zod';

import { BEAN_GRADES, RUSH_PLANS } from '@/domain/business/coffeeKioskRules';

export const savedCoffeeKiosk = z.discriminatedUnion('status', [
  z.object({ status: z.literal('inactive') }),
  z.object({
    status: z.literal('active'),
    grade: z.enum(BEAN_GRADES),
    plan: z.enum(RUSH_PLANS),
    orderAhead: z.enum(['none', 'installed']),
  }),
]);
