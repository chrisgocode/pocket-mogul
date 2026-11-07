import type { BusinessDefinition, BusinessRules } from './business/definition';
import type { OwnedBusiness } from './business/owned';
import { dollars } from './money';
import type { PropertyRules } from './propertyQuotes';

export const propertyRules: PropertyRules = {
  maxUpgradeLevel: 10,
  maxExpansionLevel: 4,
  upgradeWeightBps: { renovation: 1000, furnishings: 800, systems: 600, expansion: 2500 },
  upgradeGrowth: { numerator: 125, denominator: 100 },
  levelEffectPercent: {
    renovationRent: 10,
    furnishingsRent: 5,
    systemsSaving: 4,
    expansionRentAndUpkeep: 25,
  },
  valueUpgradePercent: 80,
  saleValuePercent: 95,
};

const unitCaps = { startup: 3, local: 8, regional: 20, national: 50, global: 120 };

export const businessRules: BusinessRules = {
  dayMs: 600_000,
  priceBps: { budget: 7000, value: 8500, standard: 10000, premium: 12500, luxury: 15000 },
  defaultPriceLevel: 'standard',
  extraUnitDemandPercent: 60,
  unitPriceBps: 4000,
  unitPriceGrowth: { numerator: 115, denominator: 100 },
  unitCapByStage: Object.values(unitCaps),
  maxTrackLevel: 20,
  upgradeWeightBps: { quality: 2500, efficiency: 1500 },
  upgradeGrowth: { numerator: 118, denominator: 100 },
  qualityDemandPercent: 8,
  efficiencySavingPercent: 3,
  defaultPayoutPercent: 50,
  payoutStepPercent: 10,
  saleReturnPercent: 60,
};

export const vendingDefinition: BusinessDefinition = {
  id: 'vending',
  tier: 1,
  price: dollars('250'),
  pricePerCustomerCents: dollars('1.40'),
  capacityPerUnit: 100,
  baseDemand: 110,
  costPerCustomerCents: dollars('0.24'),
  upkeepPerUnitCents: dollars('16'),
  catalogRevenuePerDayCents: dollars('140'),
  demandBps: { budget: 14500, value: 12000, standard: 10000, premium: 7500, luxury: 5500 },
};

export function ownedBusiness(
  definitionId: string,
  change: Partial<OwnedBusiness> = {},
): OwnedBusiness {
  return {
    definitionId,
    stage: 1,
    units: 1,
    priceLevel: 'standard',
    levels: { quality: 0, efficiency: 0 },
    payoutPercent: 50,
    treasuryCents: dollars('0'),
    profitRemainder: 0,
    payoutRemainder: 0,
    status: 'open',
    purchasedDay: 0,
    capitalizedSpendCents: dollars('250'),
    ...change,
  };
}
