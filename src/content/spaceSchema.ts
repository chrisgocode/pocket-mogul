import { z } from 'zod';

import { CADENCES } from '@/domain/business/spaceRules';

const positiveInt = z.number().int().positive();
const bps = z.number().int().min(1);
const launchedBps = z.number().int().min(0).max(10_000);
const wholePercent = z.number().int().min(1).max(100);
const id = z.string().regex(/^[a-z][a-z0-9_]*$/);
const span = <Value extends z.ZodType>(value: Value) => z.object({ min: value, max: value });
const cadence = z.object({
  capacityBps: bps,
  launchedBps: z.object({ clear: launchedBps, windy: launchedBps, storm: launchedBps }),
});

export const spaceMechanicSchema = z.object({
  kind: z.literal('space'),
  unlockStage: positiveInt,
  defaultCadence: z.enum(CADENCES),
  weatherChanceBps: z.object({ clear: bps, windy: bps, storm: bps }),
  forecastDays: positiveInt,
  cadences: z.object({ careful: cadence, standard: cadence, rapid: cadence }),
  payloads: z.object({
    offerDays: positiveInt,
    maxContracts: positiveInt,
    clients: z.array(z.object({ id, name: z.string().min(1) })).min(1),
    sizePercents: z.array(wholePercent).min(1),
    rateBps: span(bps),
    penaltyBps: bps,
    days: span(positiveInt),
  }),
  boosters: z.object({
    stage: positiveInt,
    priceMultiple: positiveInt,
    capacityPercent: positiveInt,
  }),
});

export type SpaceMechanic = z.output<typeof spaceMechanicSchema>;
