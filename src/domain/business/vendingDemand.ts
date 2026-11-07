import type { BusinessPricing } from './definition';
import type { OwnedBusiness } from './owned';
import {
  PRODUCT_LINES,
  STOCK_MIXES,
  VENDING_LOCATIONS,
  type ActiveVending,
  type StockMix,
  type VendingLocation,
  type VendingRules,
  type VendingSpot,
} from './vendingRules';

const PERCENT = 100n;
const WHOLE_PERCENT = 100;
const BASIS_POINTS = 10_000n;

export type RunningVending = { readonly rules: VendingRules; readonly operation: ActiveVending };

export function vendingRulesOf(pricing: BusinessPricing): VendingRules | undefined {
  const { mechanic } = pricing.definition;
  return mechanic.kind === 'vending' ? mechanic.vending : undefined;
}

export function runningVending(
  business: OwnedBusiness,
  pricing: BusinessPricing,
): RunningVending | undefined {
  const rules = vendingRulesOf(pricing);
  const operation = business.vending;
  if (rules === undefined || operation.status !== 'active') return undefined;
  return { rules, operation };
}

export function matchBps(
  rules: VendingRules,
  placing: { readonly location: VendingLocation; readonly mix: StockMix },
): number {
  const taste = rules.locations[placing.location].taste;
  const split = rules.mixes[placing.mix];
  const overlap = PRODUCT_LINES.reduce(
    (total, line) => total + Math.min(taste[line], split[line]),
    0,
  );
  const { poor, perfect } = rules.matchBps;
  return poor + Math.floor(((perfect - poor) * overlap) / WHOLE_PERCENT);
}

export function bestMix(rules: VendingRules, location: VendingLocation): StockMix {
  return STOCK_MIXES.reduce((best, mix) =>
    matchBps(rules, { location, mix }) > matchBps(rules, { location, mix: best }) ? mix : best,
  );
}

const isStocked = (spot: VendingSpot) => spot.machines > 0 && spot.stock > 0;

export function spotDemandWeight(
  rules: VendingRules,
  location: VendingLocation,
  spot: VendingSpot,
) {
  if (!isStocked(spot)) return 0n;
  const traffic = BigInt(rules.locations[location].trafficBps);
  const match = BigInt(matchBps(rules, { location, mix: spot.mix }));
  return (BigInt(spot.machines) * traffic * match) / BASIS_POINTS;
}

const NO_EFFECT_BPS = BASIS_POINTS;

export function vendingDemandBps(business: OwnedBusiness, pricing: BusinessPricing): bigint {
  const running = runningVending(business, pricing);
  if (running === undefined) return NO_EFFECT_BPS;
  const { rules, operation } = running;
  const weight = VENDING_LOCATIONS.reduce<bigint>(
    (total, location) => total + spotDemandWeight(rules, location, operation.spots[location]),
    0n,
  );
  const readers = operation.cardReaders === 'installed' ? rules.cardReaders.demandPercent : 0;
  return (weight * (PERCENT + BigInt(readers))) / (PERCENT * BigInt(business.units));
}

export function vendingCapacityBps(business: OwnedBusiness, pricing: BusinessPricing): bigint {
  const running = runningVending(business, pricing);
  if (running === undefined) return NO_EFFECT_BPS;
  const stocked = VENDING_LOCATIONS.reduce(
    (total, location) =>
      total +
      (isStocked(running.operation.spots[location])
        ? running.operation.spots[location].machines
        : 0),
    0,
  );
  return (BigInt(stocked) * BASIS_POINTS) / BigInt(business.units);
}
