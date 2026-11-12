import { z } from 'zod';

const positiveInt = z.number().int().positive();
const bps = z.number().int().min(1);

const crowdBps = z.object({ quiet: bps, steady: bps, busy: bps });
const menuItem = z.object({ demandBps: bps, priceBps: bps, serviceBps: bps });

export const foodCartMechanicSchema = z.object({
  kind: z.literal('food_cart'),
  unlockStage: positiveInt,
  crowdChanceBps: crowdBps,
  spots: z.object({
    park: crowdBps,
    offices: crowdBps,
    campus: crowdBps,
    market: crowdBps,
    stadium: crowdBps,
  }),
  forecastDays: positiveInt,
  menu: z.object({ combo: menuItem, snacks: menuItem, express: menuItem }),
  secondWindow: z.object({
    stage: positiveInt,
    priceMultiple: positiveInt,
    capacityPercent: positiveInt,
  }),
});

export type FoodCartMechanic = z.output<typeof foodCartMechanicSchema>;
