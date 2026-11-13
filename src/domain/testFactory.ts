import type { BusinessDefinition } from './business/definition';
import type { ActiveFactory, FactoryRules } from './business/factoryRules';
import type { OwnedBusiness } from './business/owned';
import { dollars } from './money';
import { ownedBusiness, vendingDefinition } from './testRules';

const ORDER_SIZES = { small: 20, medium: 30, large: 40 };

export const factoryRules: FactoryRules = {
  unlockStage: 2,
  defaultProduct: 'standard',
  retoolDays: 1,
  retoolCapacityBps: 5000,
  products: {
    standard: { priceBps: 10000, demandBps: 10000, costBps: 10000 },
    precision: { priceBps: 12500, demandBps: 7000, costBps: 12000 },
    custom: { priceBps: 16000, demandBps: 4500, costBps: 14000 },
  },
  bulk: {
    offerDays: 3,
    maxOrders: 2,
    clients: [
      { id: 'northfield_rail', name: 'Northfield Rail' },
      { id: 'summit_tools', name: 'Summit Tool Works' },
    ],
    sizePercents: Object.values(ORDER_SIZES),
    rateBps: { min: 10500, max: 13000 },
    penaltyBps: 5000,
    days: { min: 5, max: 10 },
  },
  automation: { stage: 5, priceMultiple: 150, costSavingPercent: 20 },
};

export const factoryDefinition: BusinessDefinition = {
  ...vendingDefinition,
  id: 'manufacturer',
  tier: 4,
  price: dollars('50,000,000'),
  pricePerCustomerCents: dollars('5,000'),
  capacityPerUnit: 1600,
  baseDemand: 1760,
  costPerCustomerCents: dollars('1,125'),
  upkeepPerUnitCents: dollars('1,200,000'),
  catalogRevenuePerDayCents: dollars('8,000,000'),
  incidents: [],
  mechanic: { kind: 'factory', factory: factoryRules },
};

const openFactory: ActiveFactory = {
  status: 'active',
  product: 'standard',
  retoolDaysLeft: 0,
  orders: [],
  answeredOffer: -1,
  automation: 'none',
};

export function factoryBusiness(
  factory: Partial<ActiveFactory> = {},
  change: Partial<OwnedBusiness> = {},
): OwnedBusiness {
  return ownedBusiness('manufacturer', {
    stage: 2,
    capitalizedSpendCents: dollars('50,000,000'),
    factory: { ...openFactory, ...factory },
    ...change,
  });
}
