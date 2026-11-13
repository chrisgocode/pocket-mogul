import { z } from 'zod';

import { NETWORKS } from '@/domain/business/airlineRules';

const positiveInt = z.number().int().positive();
const bps = z.number().int().min(1);
const wholePercent = z.number().int().min(0).max(100);
const route = z.object({ fareBps: bps, seatsBps: bps, burnBps: bps });
const share = z.object({ short: wholePercent, medium: wholePercent, long: wholePercent });
const fuelBps = z.object({ cheap: bps, normal: bps, expensive: bps });

export const airlineMechanicSchema = z.object({
  kind: z.literal('airline'),
  unlockStage: positiveInt,
  defaultNetwork: z.enum(NETWORKS),
  routes: z.object({ short: route, medium: route, long: route }),
  networks: z.object({ regional: share, mixed: share, intercontinental: share }),
  fuelChanceBps: fuelBps,
  fuelCostBps: fuelBps,
  forecastDays: positiveInt,
  repositionCapacityBps: bps.max(10_000),
  hub: z.object({ stage: positiveInt, priceMultiple: positiveInt, capacityPercent: positiveInt }),
});

export type AirlineMechanic = z.output<typeof airlineMechanicSchema>;
