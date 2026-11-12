import { economyV3 } from './economy-v3';
import { withMechanic } from './mechanicUpgrade';
import type { ContentInput } from './schema';

const coffeeKioskMechanic = {
  kind: 'coffee_kiosk',
  unlockStage: 2,
  rushDemandBps: 4500,
  rushWindowBps: 3500,
  defaultGrade: 'house',
  defaultPlan: 'standard',
  grades: {
    house: { priceBps: 10000, demandBps: 10000, costBps: 10000 },
    single_origin: { priceBps: 11500, demandBps: 9500, costBps: 14000 },
    reserve: { priceBps: 13500, demandBps: 8000, costBps: 20000 },
  },
  plans: {
    standard: { rushCapacityBps: 10000, demandBps: 10000, priceBps: 10000 },
    prebatch: { rushCapacityBps: 15000, demandBps: 9500, priceBps: 10000 },
    express: { rushCapacityBps: 20000, demandBps: 10000, priceBps: 9600 },
  },
  orderAhead: { stage: 5, priceMultiple: 150, rushCapacityPercent: 50 },
} as const;

export const economyV4 = {
  ...economyV3,
  economyVersion: 4,
  businesses: withMechanic(economyV3.businesses, {
    id: 'coffee_kiosk',
    mechanic: coffeeKioskMechanic,
  }),
} satisfies ContentInput;
