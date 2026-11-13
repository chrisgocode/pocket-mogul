import { z } from 'zod';

import { PRODUCTS } from '@/domain/business/factoryRules';
import { parseMoneyCents } from '@/domain/money';

const NO_BULK_OFFER_ANSWERED = -1;
const count = z.number().int().nonnegative();
const cents = z.string().regex(/^\d+$/).transform(parseMoneyCents);

const order = z.object({
  clientId: z.string().min(1),
  parcelsPerDay: count,
  rateCents: cents,
  penaltyCents: cents,
  endsDay: count,
});

export const savedFactory = z.discriminatedUnion('status', [
  z.object({ status: z.literal('inactive') }),
  z.object({
    status: z.literal('active'),
    product: z.enum(PRODUCTS),
    retoolDaysLeft: count,
    orders: z.array(order),
    answeredOffer: z.number().int().min(NO_BULK_OFFER_ANSWERED),
    automation: z.enum(['none', 'installed']),
  }),
]);
