import { z } from 'zod';

const WHOLE_PERCENT = 100;
const NO_OFFER_ANSWERED = -1;

const order = z.object({
  clientId: z.string().min(1),
  ordersPerDay: z.number().int().nonnegative(),
  priceBps: z.number().int().positive(),
  endsDay: z.number().int().nonnegative(),
});

export const savedBakery = z.discriminatedUnion('status', [
  z.object({ status: z.literal('inactive') }),
  z.object({
    status: z.literal('active'),
    bakePercent: z.number().int().min(1).max(WHOLE_PERCENT),
    orders: z.array(order),
    answeredOffer: z.number().int().min(NO_OFFER_ANSWERED),
    centralKitchen: z.enum(['none', 'installed']),
  }),
]);
