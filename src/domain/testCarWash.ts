import type { CarWashRules } from './business/carWashRules';
import type { ActiveCarWash } from './business/carWashState';
import type { BusinessDefinition } from './business/definition';
import type { OwnedBusiness } from './business/owned';
import { dollars } from './money';
import { ownedBusiness, vendingDefinition } from './testRules';

export const carWashRules: CarWashRules = {
  unlockStage: 2,
  packages: {
    basic: { priceBps: 8000, bayBps: 7500, sharePercent: 60 },
    deluxe: { priceBps: 12000, bayBps: 12000, sharePercent: 30 },
    ultimate: { priceBps: 17000, bayBps: 20000, sharePercent: 10 },
  },
  weatherChanceBps: { sunny: 4000, cloudy: 3500, rain: 2500 },
  weatherDemandBps: { sunny: 12000, cloudy: 10000, rain: 5000, after_rain: 16000 },
  forecastDays: 3,
  memberships: {
    feeCents: dollars('12'),
    bayBps: 5000,
    joinsPerUnit: 20,
    capStepPercent: 20,
    maxCapPercent: 80,
    defaultCapPercent: 20,
    managerCapPercent: { rainAhead: 60, clear: 20 },
  },
  detailing: { stage: 5, priceMultiple: 150, priceBps: 40000, bayBps: 36000, sharePercent: 10 },
};

export const carWashFlagship: BusinessDefinition = {
  ...vendingDefinition,
  id: 'car_wash',
  tier: 2,
  price: dollars('30,000'),
  pricePerCustomerCents: dollars('26'),
  capacityPerUnit: 500,
  baseDemand: 550,
  costPerCustomerCents: dollars('4.80'),
  upkeepPerUnitCents: dollars('1,600'),
  catalogRevenuePerDayCents: dollars('13,000'),
  incidents: [],
  mechanic: { kind: 'car_wash', carWash: carWashRules },
};

const openCarWash: ActiveCarWash = {
  status: 'active',
  weather: 'cloudy',
  packages: { deluxe: 'offered', ultimate: 'offered' },
  members: 0,
  membershipLevel: 'standard',
  memberCapPercent: 20,
  detailing: 'none',
};

export function carWashBusiness(
  carWash: Partial<ActiveCarWash> = {},
  change: Partial<OwnedBusiness> = {},
): OwnedBusiness {
  return ownedBusiness('car_wash', {
    stage: 2,
    capitalizedSpendCents: dollars('30,000'),
    carWash: { ...openCarWash, ...carWash },
    ...change,
  });
}
