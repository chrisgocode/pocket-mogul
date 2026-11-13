import { z } from 'zod';

const positiveInt = z.number().int().positive();
const bps = z.number().int().min(1);
const share = z.number().int().min(1).max(9999);
const wholePercent = z.number().int().min(0).max(100);

export const laundromatMechanicSchema = z.object({
  kind: z.literal('laundromat'),
  unlockStage: positiveInt,
  jumbo: z.object({
    customerShareBps: share,
    speedBps: bps,
    priceBps: bps,
    sharePercents: z.array(wholePercent).min(2),
  }),
  service: z.object({
    loadsPercentPerLevel: positiveInt,
    priceBpsByLevel: z.array(bps).min(1),
  }),
  pickup: z.object({
    stage: positiveInt,
    priceMultiple: positiveInt,
    demandPercent: positiveInt,
  }),
});

export type LaundromatMechanic = z.output<typeof laundromatMechanicSchema>;
