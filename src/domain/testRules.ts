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

export const businessRules: BusinessRules = {
  dayMs: 600_000,
  priceBps: { budget: 7000, value: 8500, standard: 10000, premium: 12500, luxury: 15000 },
  defaultPriceLevel: 'standard',
  extraUnitDemandPercent: 60,
  unitPriceBps: 4000,
  unitPriceGrowth: { numerator: 115, denominator: 100 },
  stages: [
    {
      unitCap: 3,
      staffCap: { operations: 2, sales: 1, manager: 0 },
      upgradePriceMultiple: 0,
      daysOwnedToReach: 0,
    },
    {
      unitCap: 8,
      staffCap: { operations: 5, sales: 2, manager: 1 },
      upgradePriceMultiple: 2,
      daysOwnedToReach: 3,
    },
    {
      unitCap: 20,
      staffCap: { operations: 12, sales: 4, manager: 1 },
      upgradePriceMultiple: 8,
      daysOwnedToReach: 10,
    },
    {
      unitCap: 50,
      staffCap: { operations: 30, sales: 6, manager: 1 },
      upgradePriceMultiple: 30,
      daysOwnedToReach: 30,
    },
    {
      unitCap: 120,
      staffCap: { operations: 80, sales: 10, manager: 1 },
      upgradePriceMultiple: 120,
      daysOwnedToReach: 60,
    },
  ],
  staff: {
    operationsCapacityPercent: 20,
    salesDemandPercent: 15,
    managerProfitPercent: 10,
    wagePercent: { operations: 4, sales: 6, manager: 10 },
    signingFeeDays: 3,
  },
  risks: {
    safeDaysAfterPurchase: 30,
    treasuryLossCapPercent: 20,
    insuranceFromStage: 2,
    premiumPercent: 2,
    coveredLossPercent: 80,
  },
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
  incidents: [
    {
      id: 'vending_breakdown',
      category: 'equipment',
      chanceBps: 250,
      effect: { kind: 'capacity', percent: 30, days: 4 },
    },
    {
      id: 'vending_vandalism',
      category: 'liability',
      chanceBps: 150,
      effect: { kind: 'treasury', revenueDays: 2 },
    },
    {
      id: 'vending_expired_stock',
      category: 'supply',
      chanceBps: 200,
      effect: { kind: 'treasury', revenueDays: 1 },
    },
  ],
  mechanic: { kind: 'shared_core' },
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
    staff: { operations: 0, sales: 0, manager: 0 },
    payoutPercent: 50,
    treasuryCents: dollars('0'),
    profitRemainder: 0,
    payoutRemainder: 0,
    status: 'open',
    purchasedDay: 0,
    capitalizedSpendCents: dollars('250'),
    insurance: { equipment: 'none', liability: 'none', supply: 'none' },
    incident: { status: 'none' },
    vending: { status: 'inactive' },
    carWash: { status: 'inactive' },
    ...change,
  };
}
