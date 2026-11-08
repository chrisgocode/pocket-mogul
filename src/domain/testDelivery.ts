import type { BusinessDefinition } from './business/definition';
import type { DeliveryRules } from './business/deliveryRules';
import type { ActiveDelivery, Contract, ContractOffer } from './business/deliveryState';
import type { OwnedBusiness } from './business/owned';
import { dollars } from './money';
import { ownedBusiness, vendingDefinition } from './testRules';

export const deliveryRules: DeliveryRules = {
  unlockStage: 2,
  vansPerDriver: 2,
  routePlannerPercent: 5,
  offers: {
    boardSize: 3,
    expiryDays: 2,
    clients: [
      { id: 'brightcart', name: 'Brightcart Online' },
      { id: 'northpine_pharmacy', name: 'Northpine Pharmacy' },
    ],
    fleetSharePercent: { min: 10, max: 35 },
    ratePercent: { min: 105, max: 140 },
    penaltyPercent: { min: 150, max: 300 },
    days: { min: 3, max: 8 },
    parcelStep: 50,
  },
  reputation: {
    windowDays: 10,
    startingStars: 3,
    stars: [
      { minOnTimeBps: 0, offerSizeBps: 6000, offerRateBps: 8500 },
      { minOnTimeBps: 7000, offerSizeBps: 8000, offerRateBps: 9200 },
      { minOnTimeBps: 8500, offerSizeBps: 10000, offerRateBps: 10000 },
      { minOnTimeBps: 9500, offerSizeBps: 12000, offerRateBps: 10800 },
      { minOnTimeBps: 9900, offerSizeBps: 14000, offerRateBps: 11500 },
    ],
  },
  sortingHub: { stage: 5, priceMultiple: 150, capacityPercent: 30 },
};

export const deliveryFlagship: BusinessDefinition = {
  ...vendingDefinition,
  id: 'delivery',
  tier: 3,
  price: dollars('250,000'),
  pricePerCustomerCents: dollars('9.50'),
  capacityPerUnit: 10_000,
  baseDemand: 11_000,
  costPerCustomerCents: dollars('2.10'),
  upkeepPerUnitCents: dollars('14,000'),
  catalogRevenuePerDayCents: dollars('95,000'),
  incidents: [],
  mechanic: { kind: 'delivery', delivery: deliveryRules },
};

const openDelivery: ActiveDelivery = {
  status: 'active',
  offers: [],
  contracts: [],
  history: [],
  sortingHub: 'none',
};

export function contract(change: Partial<Contract> = {}): Contract {
  return {
    id: '0-0',
    clientId: 'brightcart',
    parcelsPerDay: 10_000,
    rateCents: dollars('12'),
    penaltyCents: dollars('25'),
    endsDay: 5,
    ...change,
  };
}

export function deliveryBusiness(
  delivery: Partial<ActiveDelivery> = {},
  change: Partial<OwnedBusiness> = {},
): OwnedBusiness {
  return ownedBusiness('delivery', {
    stage: 2,
    units: 2,
    staff: { operations: 1, sales: 0, manager: 0 },
    capitalizedSpendCents: dollars('250,000'),
    delivery: { ...openDelivery, ...delivery },
    ...change,
  });
}

export function activeDelivery(business: OwnedBusiness | undefined): ActiveDelivery {
  const delivery = business?.delivery;
  return delivery?.status === 'active' ? delivery : openDelivery;
}

export function offersOf(business: OwnedBusiness | undefined): readonly ContractOffer[] {
  return activeDelivery(business).offers;
}
