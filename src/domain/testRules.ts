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
