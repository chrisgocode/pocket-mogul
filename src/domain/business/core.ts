import { moneyCents, type MoneyCents } from '@/domain/money';
import { geometricUpgradeCents } from '@/domain/pricing';

import {
  PRICE_LEVELS,
  type BusinessPricing,
  type BusinessTrack,
  type PriceLevel,
} from './definition';
import type { OwnedBusiness } from './owned';

export type BusinessDayQuote = {
  readonly demand: number;
  readonly capacity: number;
  readonly served: number;
  readonly priceCents: MoneyCents;
  readonly costPerServedCents: MoneyCents;
  readonly revenueCents: MoneyCents;
  readonly upkeepCents: MoneyCents;
  readonly customerCostsCents: MoneyCents;
  readonly profitCents: MoneyCents;
};

export type UnitQuote =
  | { readonly status: 'at_cap'; readonly units: number; readonly cap: number }
  | {
      readonly status: 'available';
      readonly units: number;
      readonly cap: number;
      readonly priceCents: MoneyCents;
      readonly profitCents: MoneyCents;
      readonly nextProfitCents: MoneyCents;
    };

export type ImprovementQuote =
  | { readonly status: 'max'; readonly track: BusinessTrack; readonly level: number }
  | {
      readonly status: 'available';
      readonly track: BusinessTrack;
      readonly level: number;
      readonly priceCents: MoneyCents;
      readonly profitCents: MoneyCents;
      readonly nextProfitCents: MoneyCents;
    };

const PERCENT = 100n;
const BASIS_POINTS = 10_000n;
const MS_PER_MINUTE = 60_000n;

const raisedPercent = (perStep: number, steps: number) => PERCENT + BigInt(perStep * steps);

function demandOf(business: OwnedBusiness, pricing: BusinessPricing): bigint {
  const { definition, rules } = pricing;
  const numerator =
    BigInt(definition.baseDemand) *
    raisedPercent(rules.extraUnitDemandPercent, business.units - 1) *
    BigInt(definition.demandBps[business.priceLevel]) *
    raisedPercent(rules.qualityDemandPercent, business.levels.quality);
  return numerator / (PERCENT * BASIS_POINTS * PERCENT);
}

function costPerServedOf(business: OwnedBusiness, pricing: BusinessPricing): bigint {
  const saving = pricing.rules.efficiencySavingPercent * business.levels.efficiency;
  return (pricing.definition.costPerCustomerCents * (PERCENT - BigInt(saving))) / PERCENT;
}

export function quoteBusinessDay(
  business: OwnedBusiness,
  pricing: BusinessPricing,
): BusinessDayQuote {
  const { definition, rules } = pricing;
  const demand = demandOf(business, pricing);
  const capacity = BigInt(definition.capacityPerUnit) * BigInt(business.units);
  const served = demand < capacity ? demand : capacity;
  const priceCents =
    (definition.pricePerCustomerCents * BigInt(rules.priceBps[business.priceLevel])) / BASIS_POINTS;
  const costPerServedCents = costPerServedOf(business, pricing);
  const revenueCents = served * priceCents;
  const upkeepCents = definition.upkeepPerUnitCents * BigInt(business.units);
  const customerCostsCents = served * costPerServedCents;
  return {
    demand: Number(demand),
    capacity: Number(capacity),
    served: Number(served),
    priceCents: moneyCents(priceCents),
    costPerServedCents: moneyCents(costPerServedCents),
    revenueCents: moneyCents(revenueCents),
    upkeepCents: moneyCents(upkeepCents),
    customerCostsCents: moneyCents(customerCostsCents),
    profitCents: moneyCents(revenueCents - upkeepCents - customerCostsCents),
  };
}

export function profitPerDayCents(business: OwnedBusiness, pricing: BusinessPricing): MoneyCents {
  return quoteBusinessDay(business, pricing).profitCents;
}

export function bestPriceLevel(business: OwnedBusiness, pricing: BusinessPricing): PriceLevel {
  return PRICE_LEVELS.reduce((best, priceLevel) =>
    profitPerDayCents({ ...business, priceLevel }, pricing) >
    profitPerDayCents({ ...business, priceLevel: best }, pricing)
      ? priceLevel
      : best,
  );
}

function unitCap(business: OwnedBusiness, pricing: BusinessPricing): number {
  const caps = pricing.rules.unitCapByStage;
  return caps[business.stage - 1] ?? caps[caps.length - 1] ?? business.units;
}

export function quoteUnit(business: OwnedBusiness, pricing: BusinessPricing): UnitQuote {
  const { units } = business;
  const cap = unitCap(business, pricing);
  if (units >= cap) return { status: 'at_cap', units, cap };
  return {
    status: 'available',
    units,
    cap,
    priceCents: geometricUpgradeCents({
      basePriceCents: pricing.definition.price,
      weightBps: pricing.rules.unitPriceBps,
      growth: pricing.rules.unitPriceGrowth,
      level: units - 1,
    }),
    profitCents: profitPerDayCents(business, pricing),
    nextProfitCents: profitPerDayCents({ ...business, units: units + 1 }, pricing),
  };
}

export function quoteImprovement(
  business: OwnedBusiness,
  improvement: BusinessPricing & { readonly track: BusinessTrack },
): ImprovementQuote {
  const { track, rules, definition } = improvement;
  const level = business.levels[track];
  if (level >= rules.maxTrackLevel) return { status: 'max', track, level };
  const improved = { ...business, levels: { ...business.levels, [track]: level + 1 } };
  return {
    status: 'available',
    track,
    level,
    priceCents: geometricUpgradeCents({
      basePriceCents: definition.price,
      weightBps: rules.upgradeWeightBps[track],
      growth: rules.upgradeGrowth,
      level,
    }),
    profitCents: profitPerDayCents(business, improvement),
    nextProfitCents: profitPerDayCents(improved, improvement),
  };
}

export function cashPerMinuteCents(business: OwnedBusiness, pricing: BusinessPricing): MoneyCents {
  const profit = profitPerDayCents(business, pricing);
  if (business.status === 'closed' || profit <= 0n) return moneyCents(0);
  const perDay = profit * BigInt(business.payoutPercent) * MS_PER_MINUTE;
  return moneyCents(perDay / (PERCENT * BigInt(pricing.rules.dayMs)));
}

export function carryingValueCents(business: OwnedBusiness): MoneyCents {
  return moneyCents(business.capitalizedSpendCents + business.treasuryCents);
}

export function saleProceedsCents(
  business: OwnedBusiness,
  rules: { readonly saleReturnPercent: number },
): MoneyCents {
  const spendReturn = (business.capitalizedSpendCents * BigInt(rules.saleReturnPercent)) / PERCENT;
  return moneyCents(spendReturn + business.treasuryCents);
}
