import { z } from 'zod';

const positiveInt = z.number().int().positive();
const nonNegativeInt = z.number().int().nonnegative();
const bps = z.number().int().min(1);
const id = z.string().regex(/^[a-z][a-z0-9_]*$/, 'IDs are lowercase snake_case');

const range = z.object({ min: nonNegativeInt, max: nonNegativeInt });

export const deliveryMechanicSchema = z.object({
  kind: z.literal('delivery'),
  unlockStage: positiveInt,
  vansPerDriver: positiveInt,
  routePlannerPercent: positiveInt,
  offers: z.object({
    boardSize: positiveInt,
    expiryDays: positiveInt,
    clients: z.array(z.object({ id, name: z.string().min(1) })).min(1),
    fleetSharePercent: range,
    ratePercent: range,
    penaltyPercent: range,
    days: range,
    parcelStep: positiveInt,
  }),
  reputation: z.object({
    windowDays: positiveInt,
    startingStars: positiveInt,
    stars: z.array(
      z.object({
        minOnTimeBps: z.number().int().nonnegative(),
        offerSizeBps: bps,
        offerRateBps: bps,
      }),
    ),
  }),
  sortingHub: z.object({
    stage: positiveInt,
    priceMultiple: positiveInt,
    capacityPercent: positiveInt,
  }),
});

export type DeliveryMechanic = z.output<typeof deliveryMechanicSchema>;
