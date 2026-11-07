import type { MoneyCents } from '@/domain/money';

export const PRICE_LEVELS = ['budget', 'value', 'standard', 'premium', 'luxury'] as const;
export type PriceLevel = (typeof PRICE_LEVELS)[number];

export const BUSINESS_TRACKS = ['quality', 'efficiency'] as const;
export type BusinessTrack = (typeof BUSINESS_TRACKS)[number];

export type ByPriceLevel = Readonly<Record<PriceLevel, number>>;

type Growth = { readonly numerator: number; readonly denominator: number };

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
};

export type BusinessCatalog = readonly BusinessDefinition[];

export type BusinessRules = {
  readonly dayMs: number;
  readonly priceBps: ByPriceLevel;
  readonly defaultPriceLevel: PriceLevel;
  readonly extraUnitDemandPercent: number;
  readonly unitPriceBps: number;
  readonly unitPriceGrowth: Growth;
  readonly unitCapByStage: readonly number[];
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
