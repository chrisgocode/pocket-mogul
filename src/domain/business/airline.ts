import { airlineRulesOf, runningAirline } from './airlineDemand';
import { fuelOn, type FuelDraw } from './airlineFuel';
import { NETWORKS, type ActiveAirline, type Network } from './airlineRules';
import { profitPerDayCents } from './core';
import type { BusinessPricing } from './definition';
import type { OwnedBusiness } from './owned';

export type AirlineDayStart = {
  readonly pricing: BusinessPricing;
  readonly seed: string;
  readonly day: number;
};

export function fuelDraw(
  business: OwnedBusiness,
  start: { readonly pricing: BusinessPricing; readonly seed: string },
): FuelDraw | undefined {
  const rules = airlineRulesOf(start.pricing);
  if (rules === undefined) return undefined;
  return { seed: start.seed, businessId: business.definitionId, rules };
}

export function withAirlineUnlocked(
  business: OwnedBusiness,
  start: AirlineDayStart,
): OwnedBusiness {
  const draw = fuelDraw(business, start);
  if (draw === undefined || business.airline.status === 'active') return business;
  if (business.stage < draw.rules.unlockStage) return business;
  const airline: ActiveAirline = {
    status: 'active',
    network: draw.rules.defaultNetwork,
    fuel: fuelOn(draw, start.day),
    fleet: 'flying',
    hub: 'none',
  };
  return { ...business, airline };
}

export function bestNetwork(business: OwnedBusiness, pricing: BusinessPricing): Network {
  const running = runningAirline(business, pricing);
  if (running === undefined) return NETWORKS[0];
  const settled = { ...running.operation, fleet: 'flying' as const };
  const flown = (network: Network) => ({
    network,
    profit: profitPerDayCents({ ...business, airline: { ...settled, network } }, pricing),
  });
  return NETWORKS.filter((network) => network !== settled.network)
    .map(flown)
    .reduce((best, each) => (each.profit > best.profit ? each : best), flown(settled.network))
    .network;
}

export function startAirlineDay(business: OwnedBusiness, start: AirlineDayStart): OwnedBusiness {
  const unlocked = withAirlineUnlocked(business, start);
  const running = runningAirline(unlocked, start.pricing);
  const draw = fuelDraw(unlocked, start);
  if (running === undefined || draw === undefined) return unlocked;
  const airline = { ...running.operation, fuel: fuelOn(draw, start.day), fleet: 'flying' as const };
  const fuelled = { ...unlocked, airline };
  const managed = unlocked.staff.manager > 0 && unlocked.status === 'open';
  if (!managed) return fuelled;
  return { ...fuelled, airline: { ...airline, network: bestNetwork(fuelled, start.pricing) } };
}
