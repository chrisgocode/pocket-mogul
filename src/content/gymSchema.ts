import { z } from 'zod';

import { GYM_TIERS } from '@/domain/business/gymRules';
import { moneyCents } from '@/domain/money';

const positiveInt = z.number().int().positive();
const bps = z.number().int().min(1).max(9999);
const tier = z.object({ feeCents: z.bigint().positive().transform(moneyCents), churnBps: bps });

export const gymMechanicSchema = z.object({
  kind: z.literal('gym'),
  unlockStage: positiveInt,
  defaultTier: z.enum(GYM_TIERS),
  joinsPerUnit: positiveInt,
  visitBps: bps,
  tiers: z.object({ basic: tier, plus: tier, elite: tier }),
  classes: z.object({ maxLevel: positiveInt, churnCutBps: bps, studioPercent: positiveInt }),
  allHours: z.object({
    stage: positiveInt,
    priceMultiple: positiveInt,
    capacityPercent: positiveInt,
  }),
});

export type GymMechanic = z.output<typeof gymMechanicSchema>;
