import { moneyCents, type MoneyCents } from '@/domain/money';
import { geometricUpgradeCents } from '@/domain/pricing';

import {
  INCIDENT_CATEGORIES,
  PRICE_LEVELS,
  STAFF_ROLES,
  stageRule,
  type BusinessPricing,
  type BusinessTrack,
  type PriceLevel,
  type StaffRole,
} from './definition';
import type { OwnedBusiness } from './owned';
import { mechanicDay, type MechanicDay } from './mechanics';

export type BusinessDayQuote = {
  readonly demand: number;
  readonly capacity: number;
  readonly served: number;
  readonly priceCents: MoneyCents;
  readonly costPerServedCents: MoneyCents;
  readonly revenueCents: MoneyCents;
  readonly upkeepCents: MoneyCents;
  readonly customerCostsCents: MoneyCents;
  readonly memberFeesCents: MoneyCents;
  readonly wagesCents: MoneyCents;
  readonly premiumsCents: MoneyCents;
  readonly managerBonusCents: MoneyCents;
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

type Quoting = BusinessPricing & { readonly mechanic: MechanicDay };

function demandOf(business: OwnedBusiness, pricing: Quoting): bigint {
  const { definition, rules } = pricing;
  const numerator =
    BigInt(definition.baseDemand) *
    raisedPercent(rules.extraUnitDemandPercent, business.units - 1) *
    BigInt(definition.demandBps[business.priceLevel]) *
    raisedPercent(rules.qualityDemandPercent, business.levels.quality) *
    raisedPercent(rules.staff.salesDemandPercent, business.staff.sales) *
    pricing.mechanic.demandBps;
  return numerator / (PERCENT * BASIS_POINTS * PERCENT * PERCENT * BASIS_POINTS);
}

const NO_EFFECT_BPS = 10_000;

function incidentBps(business: OwnedBusiness, effect: 'capacityBps' | 'costBps'): bigint {
  const { incident } = business;
  return BigInt(incident.status === 'active' ? incident[effect] : NO_EFFECT_BPS);
}

function baysOf(business: OwnedBusiness, pricing: Quoting): bigint {
  const { definition, rules } = pricing;
  const numerator =
    BigInt(definition.capacityPerUnit) *
    BigInt(business.units) *
    raisedPercent(rules.staff.operationsCapacityPercent, business.staff.operations) *
    incidentBps(business, 'capacityBps') *
    pricing.mechanic.capacityBps;
  return numerator / (PERCENT * BASIS_POINTS * BASIS_POINTS);
}

export function bayCapacity(business: OwnedBusiness, pricing: BusinessPricing): number {
  return Number(baysOf(business, { ...pricing, mechanic: mechanicDay(business, pricing) }));
}

function walkInCapacityOf(business: OwnedBusiness, pricing: Quoting): bigint {
  const bays = baysOf(business, pricing);
  const { memberBay, bayBps } = pricing.mechanic;
  const free = bays > memberBay ? bays - memberBay : 0n;
  return (free * BASIS_POINTS) / bayBps;
}

function memberWashesOf(business: OwnedBusiness, pricing: Quoting): bigint {
  const bays = baysOf(business, pricing);
  const { memberBay } = pricing.mechanic;
  return memberBay < bays ? memberBay : bays;
}

export function premiumCents(pricing: BusinessPricing): MoneyCents {
  const percent = BigInt(pricing.rules.risks.premiumPercent);
  return moneyCents((pricing.definition.catalogRevenuePerDayCents * percent) / PERCENT);
}

function activePolicies(business: OwnedBusiness): number {
  return INCIDENT_CATEGORIES.filter((category) => business.insurance[category] === 'active').length;
}

export function wageCents(pricing: BusinessPricing, role: StaffRole): MoneyCents {
  const percent = BigInt(pricing.rules.staff.wagePercent[role]);
  return moneyCents((pricing.definition.catalogRevenuePerDayCents * percent) / PERCENT);
}

function wagesOf(business: OwnedBusiness, pricing: BusinessPricing): bigint {
  return STAFF_ROLES.reduce<bigint>(
    (total, role) => total + wageCents(pricing, role) * BigInt(business.staff[role]),
    0n,
  );
}

function managerBonusOf(gross: bigint, business: OwnedBusiness, pricing: BusinessPricing) {
  if (gross <= 0n || business.staff.manager === 0) return 0n;
  return (gross * BigInt(pricing.rules.staff.managerProfitPercent)) / PERCENT;
}

function costPerServedOf(business: OwnedBusiness, pricing: BusinessPricing): bigint {
  const saving = pricing.rules.efficiencySavingPercent * business.levels.efficiency;
  const numerator =
    pricing.definition.costPerCustomerCents *
    (PERCENT - BigInt(saving)) *
    incidentBps(business, 'costBps');
  return numerator / (PERCENT * BASIS_POINTS);
}

function dayCosts(business: OwnedBusiness, quoting: Quoting & { readonly served: bigint }) {
  const costPerServedCents = costPerServedOf(business, quoting);
  const washes = quoting.served + memberWashesOf(business, quoting);
  return {
    costPerServedCents,
    upkeepCents: quoting.definition.upkeepPerUnitCents * BigInt(business.units),
    customerCostsCents: washes * costPerServedCents,
    wagesCents: wagesOf(business, quoting),
    premiumsCents: premiumCents(quoting) * BigInt(activePolicies(business)),
  };
}

function priceOf(business: OwnedBusiness, quoting: Quoting): bigint {
  const levelBps = BigInt(quoting.rules.priceBps[business.priceLevel]);
  const numerator = quoting.definition.pricePerCustomerCents * levelBps * quoting.mechanic.priceBps;
  return numerator / (BASIS_POINTS * BASIS_POINTS);
}

export function quoteBusinessDay(
  business: OwnedBusiness,
  pricing: BusinessPricing,
): BusinessDayQuote {
  const quoting = { ...pricing, mechanic: mechanicDay(business, pricing) };
  const demand = demandOf(business, quoting);
  const capacity = walkInCapacityOf(business, quoting);
  const served = demand < capacity ? demand : capacity;
  const priceCents = priceOf(business, quoting);
  const revenueCents = served * priceCents;
  const costs = dayCosts(business, { ...quoting, served });
  const memberFeesCents = quoting.mechanic.memberFeesCents;
  const gross =
    revenueCents +
    memberFeesCents -
    costs.upkeepCents -
    costs.customerCostsCents -
    costs.wagesCents -
    costs.premiumsCents;
  const managerBonusCents = managerBonusOf(gross, business, pricing);
  return {
    demand: Number(demand),
    capacity: Number(capacity),
    served: Number(served),
    priceCents: moneyCents(priceCents),
    costPerServedCents: moneyCents(costs.costPerServedCents),
    revenueCents: moneyCents(revenueCents),
    upkeepCents: moneyCents(costs.upkeepCents),
    customerCostsCents: moneyCents(costs.customerCostsCents),
    memberFeesCents: moneyCents(memberFeesCents),
    wagesCents: moneyCents(costs.wagesCents),
    premiumsCents: moneyCents(costs.premiumsCents),
    managerBonusCents: moneyCents(managerBonusCents),
    profitCents: moneyCents(gross + managerBonusCents),
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

export function unitCap(business: OwnedBusiness, pricing: BusinessPricing): number {
  return stageRule(pricing.rules, business.stage)?.unitCap ?? business.units;
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
