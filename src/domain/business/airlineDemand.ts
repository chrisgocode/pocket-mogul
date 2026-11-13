import {
  ROUTES,
  type ActiveAirline,
  type AirlineRules,
  type Network,
  type RouteRule,
} from './airlineRules';
import type { BusinessPricing } from './definition';
import type { OwnedBusiness } from './owned';

export type RunningAirline = { readonly rules: AirlineRules; readonly operation: ActiveAirline };

const PERCENT = 100n;
const BASIS_POINTS = 10_000n;

export function airlineRulesOf(pricing: BusinessPricing): AirlineRules | undefined {
  const { mechanic } = pricing.definition;
  return mechanic.kind === 'airline' ? mechanic.airline : undefined;
}

export function runningAirline(
  business: OwnedBusiness,
  pricing: BusinessPricing,
): RunningAirline | undefined {
  const rules = airlineRulesOf(pricing);
  const operation = business.airline;
  if (rules === undefined || operation.status !== 'active') return undefined;
  return { rules, operation };
}

export function networkBps(
  rules: AirlineRules,
  flying: { readonly network: Network; readonly figure: keyof RouteRule },
): bigint {
  const share = rules.networks[flying.network];
  return ROUTES.reduce(
    (total, route) =>
      total + (BigInt(share[route]) * BigInt(rules.routes[route][flying.figure])) / PERCENT,
    0n,
  );
}

export type AirlineDay = {
  readonly priceBps: bigint;
  readonly capacityBps: bigint;
  readonly costBps: bigint;
};

export function airlineDay(running: RunningAirline): AirlineDay {
  const { rules, operation } = running;
  const { network } = operation;
  const hub = PERCENT + BigInt(operation.hub === 'installed' ? rules.hub.capacityPercent : 0);
  const moving = operation.fleet === 'repositioning';
  const flying = moving ? BigInt(rules.repositionCapacityBps) : BASIS_POINTS;
  const seats = networkBps(rules, { network, figure: 'seatsBps' });
  const burn = networkBps(rules, { network, figure: 'burnBps' });
  return {
    priceBps: networkBps(rules, { network, figure: 'fareBps' }),
    capacityBps: (seats * hub * flying) / (PERCENT * BASIS_POINTS),
    costBps: (burn * BigInt(rules.fuelCostBps[operation.fuel])) / BASIS_POINTS,
  };
}
