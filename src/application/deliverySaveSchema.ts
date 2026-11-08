import { z } from 'zod';

import { parseMoneyCents } from '@/domain/money';

const count = z.number().int().nonnegative();
const positiveCount = z.number().int().positive();
const cents = z.string().regex(/^\d+$/).transform(parseMoneyCents);

const terms = {
  id: z.string().min(1),
  clientId: z.string(),
  parcelsPerDay: positiveCount,
  rateCents: cents,
  penaltyCents: cents,
};

export const savedDelivery = z.discriminatedUnion('status', [
  z.object({ status: z.literal('inactive') }),
  z.object({
    status: z.literal('active'),
    offers: z.array(z.object({ ...terms, days: positiveCount, postedDay: count })),
    contracts: z.array(z.object({ ...terms, endsDay: count })),
    history: z.array(z.object({ due: count, delivered: count })),
    sortingHub: z.enum(['none', 'installed']),
  }),
]);
