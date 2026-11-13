import { z } from 'zod';

import { CADENCES, LAUNCH_WEATHERS } from '@/domain/business/spaceRules';
import { parseMoneyCents } from '@/domain/money';

const NO_PAYLOAD_OFFER_ANSWERED = -1;
const count = z.number().int().nonnegative();
const cents = z.string().regex(/^\d+$/).transform(parseMoneyCents);

const contract = z.object({
  clientId: z.string().min(1),
  parcelsPerDay: count,
  rateCents: cents,
  penaltyCents: cents,
  endsDay: count,
});

export const savedSpace = z.discriminatedUnion('status', [
  z.object({ status: z.literal('inactive') }),
  z.object({
    status: z.literal('active'),
    cadence: z.enum(CADENCES),
    weather: z.enum(LAUNCH_WEATHERS),
    contracts: z.array(contract),
    answeredOffer: z.number().int().min(NO_PAYLOAD_OFFER_ANSWERED),
    boosters: z.enum(['none', 'installed']),
  }),
]);
