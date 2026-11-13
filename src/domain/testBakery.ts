import type { ActiveBakery, BakeryRules } from './business/bakeryRules';
import type { BusinessDefinition } from './business/definition';
import type { OwnedBusiness } from './business/owned';
import { dollars } from './money';
import { ownedBusiness, vendingDefinition } from './testRules';

const BAKE_LEVELS = { low: 60, medium: 70, high: 80, higher: 90, full: 100 };
const ORDER_SIZES = { small: 10, medium: 15, large: 20 };

export const bakeryRules: BakeryRules = {
  unlockStage: 2,
  bakePercents: Object.values(BAKE_LEVELS),
  staleCostBps: 10000,
  wholesale: {
    offerDays: 2,
    maxOrders: 2,
    clients: [
      { id: 'corner_cafe', name: 'Corner Café' },
      { id: 'harbor_hotel', name: 'Harbor Hotel' },
    ],
    sizePercents: Object.values(ORDER_SIZES),
    priceBps: { min: 6500, max: 8500 },
    days: { min: 4, max: 8 },
  },
  centralKitchen: { stage: 5, priceMultiple: 150, capacityPercent: 30 },
};

export const bakeryDefinition: BusinessDefinition = {
  ...vendingDefinition,
  id: 'bakery',
  tier: 2,
  price: dollars('100,000'),
  pricePerCustomerCents: dollars('40'),
  capacityPerUnit: 1000,
  baseDemand: 1100,
  costPerCustomerCents: dollars('7.20'),
  upkeepPerUnitCents: dollars('4,800'),
  catalogRevenuePerDayCents: dollars('40,000'),
  incidents: [],
  mechanic: { kind: 'bakery', bakery: bakeryRules },
};

const openBakery: ActiveBakery = {
  status: 'active',
  bakePercent: 100,
  orders: [],
  answeredOffer: -1,
  centralKitchen: 'none',
};

export function bakeryBusiness(
  bakery: Partial<ActiveBakery> = {},
  change: Partial<OwnedBusiness> = {},
): OwnedBusiness {
  return ownedBusiness('bakery', {
    stage: 2,
    capitalizedSpendCents: dollars('100,000'),
    bakery: { ...openBakery, ...bakery },
    ...change,
  });
}
