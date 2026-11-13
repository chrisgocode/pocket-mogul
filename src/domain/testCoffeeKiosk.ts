import type { ActiveCoffeeKiosk, CoffeeKioskRules } from './business/coffeeKioskRules';
import type { BusinessDefinition } from './business/definition';
import type { OwnedBusiness } from './business/owned';
import { dollars } from './money';
import { ownedBusiness, vendingDefinition } from './testRules';

const coffeeKioskRules: CoffeeKioskRules = {
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
};

export const coffeeKioskDefinition: BusinessDefinition = {
  ...vendingDefinition,
  id: 'coffee_kiosk',
  tier: 1,
  price: dollars('4,000'),
  pricePerCustomerCents: dollars('4.60'),
  capacityPerUnit: 500,
  baseDemand: 550,
  costPerCustomerCents: dollars('0.84'),
  upkeepPerUnitCents: dollars('280'),
  catalogRevenuePerDayCents: dollars('2,300'),
  incidents: [],
  mechanic: { kind: 'coffee_kiosk', coffeeKiosk: coffeeKioskRules },
};

const openCoffeeKiosk: ActiveCoffeeKiosk = {
  status: 'active',
  grade: 'house',
  plan: 'standard',
  orderAhead: 'none',
};

export function coffeeKioskBusiness(
  coffeeKiosk: Partial<ActiveCoffeeKiosk> = {},
  change: Partial<OwnedBusiness> = {},
): OwnedBusiness {
  return ownedBusiness('coffee_kiosk', {
    stage: 2,
    capitalizedSpendCents: dollars('4,000'),
    coffeeKiosk: { ...openCoffeeKiosk, ...coffeeKiosk },
    ...change,
  });
}
