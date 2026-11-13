import type { MoneyCents } from '@/domain/money';

import type { BusinessMechanic } from './mechanicRules';
import type { Synergy } from './synergyRules';
import type { Rival, TakeoverRules } from './takeoverState';

export const PRICE_LEVELS = ['budget', 'value', 'standard', 'premium', 'luxury'] as const;
export type PriceLevel = (typeof PRICE_LEVELS)[number];

export const BUSINESS_TRACKS = ['quality', 'efficiency'] as const;
export type BusinessTrack = (typeof BUSINESS_TRACKS)[number];

export const STAFF_ROLES = ['operations', 'sales', 'manager'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
export type StaffCounts = Readonly<Record<StaffRole, number>>;

export const NO_STAFF: StaffCounts = { operations: 0, sales: 0, manager: 0 };

export const INCIDENT_CATEGORIES = ['equipment', 'liability', 'supply'] as const;
export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number];

export type IncidentEffect =
  | { readonly kind: 'treasury'; readonly revenueDays: number }
  | { readonly kind: 'capacity'; readonly percent: number; readonly days: number }
  | { readonly kind: 'cost'; readonly percent: number; readonly days: number };

export type IncidentType = {
  readonly id: string;
  readonly category: IncidentCategory;
  readonly chanceBps: number;
  readonly effect: IncidentEffect;
};

export type RiskRules = {
  readonly safeDaysAfterPurchase: number;
  readonly treasuryLossCapPercent: number;
  readonly insuranceFromStage: number;
  readonly premiumPercent: number;
  readonly coveredLossPercent: number;
};

export type ByPriceLevel = Readonly<Record<PriceLevel, number>>;

type Growth = { readonly numerator: number; readonly denominator: number };

export type StageRule = {
  readonly unitCap: number;
  readonly staffCap: StaffCounts;
  readonly upgradePriceMultiple: number;
  readonly daysOwnedToReach: number;
};

export type StaffRules = {
  readonly operationsCapacityPercent: number;
  readonly salesDemandPercent: number;
  readonly managerProfitPercent: number;
  readonly wagePercent: StaffCounts;
  readonly signingFeeDays: number;
};

export type BusinessDefinition = {
  readonly id: string;
  readonly tier: number;
  readonly price: MoneyCents;
  readonly pricePerCustomerCents: MoneyCents;
  readonly capacityPerUnit: number;
  readonly baseDemand: number;
  readonly costPerCustomerCents: MoneyCents;
  readonly upkeepPerUnitCents: MoneyCents;
  readonly catalogRevenuePerDayCents: MoneyCents;
  readonly demandBps: ByPriceLevel;
  readonly incidents: readonly IncidentType[];
  readonly mechanic: BusinessMechanic;
  readonly rivals: readonly Rival[];
  readonly synergies: readonly Synergy[];
};

export type BusinessCatalog = readonly BusinessDefinition[];

export type BusinessRules = {
  readonly dayMs: number;
  readonly priceBps: ByPriceLevel;
  readonly defaultPriceLevel: PriceLevel;
  readonly extraUnitDemandPercent: number;
  readonly unitPriceBps: number;
  readonly unitPriceGrowth: Growth;
  readonly stages: readonly StageRule[];
  readonly staff: StaffRules;
  readonly risks: RiskRules;
  readonly takeovers: TakeoverRules;
  readonly sectorMultipleDays: number;
  readonly maxTrackLevel: number;
  readonly upgradeWeightBps: Readonly<Record<BusinessTrack, number>>;
  readonly upgradeGrowth: Growth;
  readonly qualityDemandPercent: number;
  readonly efficiencySavingPercent: number;
  readonly defaultPayoutPercent: number;
  readonly payoutStepPercent: number;
  readonly saleReturnPercent: number;
};

export type BusinessPricing = {
  readonly definition: BusinessDefinition;
  readonly rules: BusinessRules;
};

export type BusinessEconomy = {
  readonly listedSaleFeeBps?: number;
  readonly catalog: BusinessCatalog;
  readonly rules: BusinessRules;
};

export function findBusiness(
  catalog: BusinessCatalog,
  definitionId: string,
): BusinessDefinition | undefined {
  return catalog.find((definition) => definition.id === definitionId);
}

export function businessDayOf(simulationMs: number, rules: BusinessRules): number {
  return Math.floor(simulationMs / rules.dayMs);
}

export function stageRule(rules: BusinessRules, stage: number): StageRule | undefined {
  return rules.stages[stage - 1];
}
