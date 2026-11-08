import { z } from 'zod';

import { moneyCents } from '@/domain/money';

const positiveInt = z.number().int().positive();
const wholePercent = z.number().int().min(0).max(100);
const bps = z.number().int().min(1);

const washPackage = z.object({ priceBps: bps, bayBps: bps, sharePercent: wholePercent });

export const carWashMechanicSchema = z.object({
  kind: z.literal('car_wash'),
  unlockStage: positiveInt,
  packages: z.object({ basic: washPackage, deluxe: washPackage, ultimate: washPackage }),
  weatherChanceBps: z.object({ sunny: bps, cloudy: bps, rain: bps }),
  weatherDemandBps: z.object({ sunny: bps, cloudy: bps, rain: bps, after_rain: bps }),
  forecastDays: positiveInt,
  memberships: z.object({
    feeCents: z.bigint().positive().transform(moneyCents),
    bayBps: bps,
    joinsPerUnit: positiveInt,
    capStepPercent: positiveInt,
    maxCapPercent: wholePercent,
    defaultCapPercent: wholePercent,
    managerCapPercent: z.object({ rainAhead: wholePercent, clear: wholePercent }),
  }),
  detailing: washPackage.extend({ stage: positiveInt, priceMultiple: positiveInt }),
});

export type CarWashMechanic = z.output<typeof carWashMechanicSchema>;
