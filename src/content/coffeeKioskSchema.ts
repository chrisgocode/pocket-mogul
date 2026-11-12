import { z } from 'zod';

import { BEAN_GRADES, RUSH_PLANS } from '@/domain/business/coffeeKioskRules';

const positiveInt = z.number().int().positive();
const bps = z.number().int().min(1);
const share = z.number().int().min(1).max(9999);

const grade = z.object({ priceBps: bps, demandBps: bps, costBps: bps });
const plan = z.object({ rushCapacityBps: bps, demandBps: bps, priceBps: bps });

export const coffeeKioskMechanicSchema = z.object({
  kind: z.literal('coffee_kiosk'),
  unlockStage: positiveInt,
  rushDemandBps: share,
  rushWindowBps: share,
  defaultGrade: z.enum(BEAN_GRADES),
  defaultPlan: z.enum(RUSH_PLANS),
  grades: z.object({ house: grade, single_origin: grade, reserve: grade }),
  plans: z.object({ standard: plan, prebatch: plan, express: plan }),
  orderAhead: z.object({
    stage: positiveInt,
    priceMultiple: positiveInt,
    rushCapacityPercent: positiveInt,
  }),
});

export type CoffeeKioskMechanic = z.output<typeof coffeeKioskMechanicSchema>;
