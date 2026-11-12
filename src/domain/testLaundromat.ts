import type { BusinessDefinition } from './business/definition';
import type { ActiveLaundromat, LaundromatRules } from './business/laundromatRules';
import type { OwnedBusiness } from './business/owned';
import { dollars } from './money';
import { ownedBusiness, vendingDefinition } from './testRules';

const JUMBO_SHARES = { none: 0, some: 20, half: 40, most: 60 };
const SERVICE_PRICES = { first: 15000, second: 12500, third: 10500 };

const laundromatRules: LaundromatRules = {
  unlockStage: 2,
  jumbo: {
    customerShareBps: 3000,
    speedBps: 7000,
    priceBps: 16000,
    sharePercents: Object.values(JUMBO_SHARES),
  },
  service: { loadsPercentPerLevel: 10, priceBpsByLevel: Object.values(SERVICE_PRICES) },
  pickup: { stage: 5, priceMultiple: 150, demandPercent: 25 },
};

export const laundromatDefinition: BusinessDefinition = {
  ...vendingDefinition,
  id: 'laundromat',
  tier: 2,
  price: dollars('7,500'),
  pricePerCustomerCents: dollars('7'),
  capacityPerUnit: 500,
  baseDemand: 550,
  costPerCustomerCents: dollars('1.20'),
  upkeepPerUnitCents: dollars('400'),
  catalogRevenuePerDayCents: dollars('3,500'),
  incidents: [],
  mechanic: { kind: 'laundromat', laundromat: laundromatRules },
};

const openLaundromat: ActiveLaundromat = {
  status: 'active',
  jumboPercent: 0,
  serviceLevel: 0,
  pickup: 'none',
};

export function laundromatBusiness(
  laundromat: Partial<ActiveLaundromat> = {},
  change: Partial<OwnedBusiness> = {},
): OwnedBusiness {
  return ownedBusiness('laundromat', {
    stage: 2,
    capitalizedSpendCents: dollars('7,500'),
    laundromat: { ...openLaundromat, ...laundromat },
    ...change,
  });
}
