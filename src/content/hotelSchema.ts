import { z } from 'zod';

const positiveInt = z.number().int().positive();
const bps = z.number().int().min(1);
const seasonBps = z.object({ low: bps, shoulder: bps, high: bps, event: bps });

export const hotelMechanicSchema = z.object({
  kind: z.literal('hotel'),
  unlockStage: positiveInt,
  seasonDays: positiveInt,
  forecastSeasons: positiveInt,
  seasonChanceBps: seasonBps,
  seasonDemandBps: seasonBps,
  stars: z.object({
    max: positiveInt,
    qualityPerStar: positiveInt,
    unitsPerHousekeeper: positiveInt,
    priceBpsPerStar: bps,
  }),
  conference: z.object({
    stage: positiveInt,
    priceMultiple: positiveInt,
    eventDemandPercent: positiveInt,
  }),
});

export type HotelMechanic = z.output<typeof hotelMechanicSchema>;
