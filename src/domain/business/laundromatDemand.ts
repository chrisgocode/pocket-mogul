import type { BusinessPricing } from './definition';
import type { ActiveLaundromat, LaundromatRules } from './laundromatRules';
import type { OwnedBusiness } from './owned';
import { NO_RUSH, type RushDay } from './rush';

export type RunningLaundromat = {
  readonly rules: LaundromatRules;
  readonly operation: ActiveLaundromat;
};

const PERCENT = 100n;
const BPS_PER_PERCENT = 100n;
const BASIS_POINTS = 10_000n;

export function laundromatRulesOf(pricing: BusinessPricing): LaundromatRules | undefined {
  const { mechanic } = pricing.definition;
  return mechanic.kind === 'laundromat' ? mechanic.laundromat : undefined;
}

export function runningLaundromat(
  business: OwnedBusiness,
  pricing: BusinessPricing,
): RunningLaundromat | undefined {
  const rules = laundromatRulesOf(pricing);
  const operation = business.laundromat;
  if (rules === undefined || operation.status !== 'active') return undefined;
  return { rules, operation };
}

export function staffedServiceLevel(business: OwnedBusiness, running: RunningLaundromat): number {
  return Math.min(running.operation.serviceLevel, business.staff.operations);
}

export function serviceLoads(
  business: OwnedBusiness,
  serving: BusinessPricing & { readonly running: RunningLaundromat },
): bigint {
  const level = staffedServiceLevel(business, serving.running);
  const percent = BigInt(serving.running.rules.service.loadsPercentPerLevel * level);
  return (BigInt(serving.definition.capacityPerUnit * business.units) * percent) / PERCENT;
}

export function serviceFeesCents(
  business: OwnedBusiness,
  serving: BusinessPricing & { readonly running: RunningLaundromat },
): bigint {
  const level = staffedServiceLevel(business, serving.running);
  const priceBps = serving.running.rules.service.priceBpsByLevel[level - 1] ?? 0;
  const loads = serviceLoads(business, serving);
  return (loads * serving.definition.pricePerCustomerCents * BigInt(priceBps)) / BASIS_POINTS;
}

export function jumboPool(running: RunningLaundromat): RushDay {
  const { jumbo } = running.rules;
  const { jumboPercent } = running.operation;
  if (jumboPercent === 0) return NO_RUSH;
  return {
    demandShareBps: BigInt(jumbo.customerShareBps),
    windowBps: BigInt(jumboPercent) * BPS_PER_PERCENT,
    boostBps: BigInt(jumbo.speedBps),
    priceBps: BigInt(jumbo.priceBps),
  };
}

export type LaundromatDay = {
  readonly demandBps: bigint;
  readonly memberBay: bigint;
  readonly memberFeesCents: bigint;
  readonly rush: RushDay;
};

export function laundromatDay(
  business: OwnedBusiness,
  serving: BusinessPricing & { readonly running: RunningLaundromat },
): LaundromatDay {
  const { rules, operation } = serving.running;
  const pickup = operation.pickup === 'installed' ? rules.pickup.demandPercent : 0;
  return {
    demandBps: BPS_PER_PERCENT * (PERCENT + BigInt(pickup)),
    memberBay: serviceLoads(business, serving),
    memberFeesCents: serviceFeesCents(business, serving),
    rush: jumboPool(serving.running),
  };
}
