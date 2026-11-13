import type { BusinessDefinition } from './business/definition';
import type { FoodCartRules } from './business/foodCartRules';
import type { ActiveFoodCart } from './business/foodCartState';
import type { OwnedBusiness } from './business/owned';
import { dollars } from './money';
import { ownedBusiness, vendingDefinition } from './testRules';

export const foodCartRules: FoodCartRules = {
  unlockStage: 2,
  crowdChanceBps: { quiet: 3000, steady: 4000, busy: 3000 },
  spots: {
    park: { quiet: 8000, steady: 10000, busy: 12500 },
    offices: { quiet: 9000, steady: 10500, busy: 11500 },
    campus: { quiet: 6500, steady: 10000, busy: 14500 },
    market: { quiet: 5000, steady: 10500, busy: 17000 },
    stadium: { quiet: 3000, steady: 9000, busy: 22000 },
  },
  forecastDays: 1,
  menu: {
    combo: { demandBps: 10000, priceBps: 12000, serviceBps: 8000 },
    snacks: { demandBps: 13000, priceBps: 9200, serviceBps: 10000 },
    express: { demandBps: 9000, priceBps: 10000, serviceBps: 12000 },
  },
  secondWindow: { stage: 5, priceMultiple: 150, capacityPercent: 30 },
};

export const foodCartDefinition: BusinessDefinition = {
  ...vendingDefinition,
  id: 'food_cart',
  tier: 1,
  price: dollars('1,250'),
  pricePerCustomerCents: dollars('9'),
  capacityPerUnit: 80,
  baseDemand: 88,
  costPerCustomerCents: dollars('1.65'),
  upkeepPerUnitCents: dollars('88'),
  catalogRevenuePerDayCents: dollars('720'),
  incidents: [],
  mechanic: { kind: 'food_cart', foodCart: foodCartRules },
};

const openFoodCart: ActiveFoodCart = {
  status: 'active',
  spot: 'park',
  crowds: {
    park: 'steady',
    offices: 'steady',
    campus: 'steady',
    market: 'steady',
    stadium: 'steady',
  },
  menu: { combo: 'withdrawn', snacks: 'withdrawn', express: 'withdrawn' },
  secondWindow: 'none',
};

export function foodCartBusiness(
  foodCart: Partial<ActiveFoodCart> = {},
  change: Partial<OwnedBusiness> = {},
): OwnedBusiness {
  return ownedBusiness('food_cart', {
    stage: 2,
    capitalizedSpendCents: dollars('1,250'),
    foodCart: { ...openFoodCart, ...foodCart },
    ...change,
  });
}
