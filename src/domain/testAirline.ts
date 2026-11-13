import type { ActiveAirline, AirlineRules } from './business/airlineRules';
import type { BusinessDefinition } from './business/definition';
import type { OwnedBusiness } from './business/owned';
import { dollars } from './money';
import { ownedBusiness, vendingDefinition } from './testRules';

export const airlineRules: AirlineRules = {
  unlockStage: 2,
  defaultNetwork: 'regional',
  routes: {
    short: { fareBps: 10000, seatsBps: 10000, burnBps: 10000 },
    medium: { fareBps: 15000, seatsBps: 7000, burnBps: 16000 },
    long: { fareBps: 24000, seatsBps: 4500, burnBps: 40000 },
  },
  networks: {
    regional: { short: 100, medium: 0, long: 0 },
    mixed: { short: 50, medium: 35, long: 15 },
    intercontinental: { short: 20, medium: 35, long: 45 },
  },
  fuelChanceBps: { cheap: 2500, normal: 5000, expensive: 2500 },
  fuelCostBps: { cheap: 5000, normal: 10000, expensive: 18000 },
  forecastDays: 2,
  repositionCapacityBps: 7000,
  hub: { stage: 5, priceMultiple: 150, capacityPercent: 15 },
};

export const airlineDefinition: BusinessDefinition = {
  ...vendingDefinition,
  id: 'airline',
  tier: 4,
  price: dollars('250,000,000'),
  pricePerCustomerCents: dollars('360'),
  capacityPerUnit: 100000,
  baseDemand: 110000,
  costPerCustomerCents: dollars('84'),
  upkeepPerUnitCents: dollars('5,600,000'),
  catalogRevenuePerDayCents: dollars('36,000,000'),
  incidents: [],
  mechanic: { kind: 'airline', airline: airlineRules },
};

const openAirline: ActiveAirline = {
  status: 'active',
  network: 'regional',
  fuel: 'normal',
  fleet: 'flying',
  hub: 'none',
};

export function airlineBusiness(
  airline: Partial<ActiveAirline> = {},
  change: Partial<OwnedBusiness> = {},
): OwnedBusiness {
  return ownedBusiness('airline', {
    stage: 2,
    capitalizedSpendCents: dollars('250,000,000'),
    airline: { ...openAirline, ...airline },
    ...change,
  });
}
