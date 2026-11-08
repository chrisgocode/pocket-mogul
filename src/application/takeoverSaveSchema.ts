import { z } from 'zod';

import { parseMoneyCents } from '@/domain/money';

const count = z.number().int().nonnegative();
const rivalId = z.string().min(1);
const cents = z.string().regex(/^\d+$/).transform(parseMoneyCents);

export const savedTakeovers = z.object({
  offer: z.discriminatedUnion('status', [
    z.object({ status: z.literal('none') }),
    z.object({ status: z.literal('pending'), rivalId, amountCents: cents }),
  ]),
  locks: z.array(z.object({ rivalId, untilDay: count })),
  merged: z.array(rivalId),
});
