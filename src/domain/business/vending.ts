import { moneyCents } from '@/domain/money';

import { quoteBusinessDay } from './core';
import type { BusinessPricing } from './definition';
import type { OwnedBusiness } from './owned';
import {
  bestMix,
  runningVending,
  spotDemandWeight,
  vendingRulesOf,
  type RunningVending,
} from './vendingDemand';
import {
  HOME_LOCATION,
  VENDING_LOCATIONS,
  type ActiveVending,
  type VendingLocation,
  type VendingRules,
  type VendingSpot,
  type VendingSpots,
} from './vendingRules';

function byLocation<Value>(
  pick: (location: VendingLocation) => Value,
): Readonly<Record<VendingLocation, Value>> {
  return {
    office: pick('office'),
    gym: pick('gym'),
    school: pick('school'),
    station: pick('station'),
    hospital: pick('hospital'),
  };
}

export const fullStock = (rules: VendingRules, machines: number) =>
  machines * rules.stockPerMachine;

const needsRestock = (rules: VendingRules, spot: VendingSpot) =>
  spot.machines > 0 && spot.stock < fullStock(rules, spot.machines);

export function restockCents(
  rules: VendingRules,
  restocking: { readonly location: VendingLocation; readonly spot: VendingSpot },
): bigint {
  if (!needsRestock(rules, restocking.spot)) return 0n;
  const fee = rules.locations[restocking.location].restockFeePerMachineCents;
  return fee * BigInt(restocking.spot.machines);
}

export function withSpots(
  business: OwnedBusiness,
  change: { readonly operation: ActiveVending; readonly spots: VendingSpots },
): OwnedBusiness {
  return { ...business, vending: { ...change.operation, spots: change.spots } };
}

function freshSpots(rules: VendingRules, units: number): VendingSpots {
  return byLocation((location) => {
    const machines = location === HOME_LOCATION ? units : 0;
    return { machines, mix: rules.defaultMix, stock: fullStock(rules, machines) };
  });
}

function withHomeMachines(spots: VendingSpots, units: number): VendingSpots {
  const away = VENDING_LOCATIONS.filter((location) => location !== HOME_LOCATION).reduce(
    (total, location) => total + spots[location].machines,
    0,
  );
  const home = spots[HOME_LOCATION];
  const machines = Math.max(0, units - away);
  if (machines === home.machines) return spots;
  return { ...spots, [HOME_LOCATION]: { ...home, machines } };
}

export function withVendingUnlocked(
  business: OwnedBusiness,
  pricing: BusinessPricing,
): OwnedBusiness {
  const rules = vendingRulesOf(pricing);
  if (rules === undefined || business.stage < rules.unlockStage) return business;
  const operation = business.vending;
  if (operation.status === 'inactive') {
    const spots = freshSpots(rules, business.units);
    return { ...business, vending: { status: 'active', spots, cardReaders: 'none' } };
  }
  const spots = withHomeMachines(operation.spots, business.units);
  return spots === operation.spots ? business : withSpots(business, { operation, spots });
}

export function soldVendingDay(business: OwnedBusiness, pricing: BusinessPricing): OwnedBusiness {
  const running = runningVending(business, pricing);
  if (running === undefined || business.status === 'closed') return business;
  const { rules, operation } = running;
  const weights = byLocation((location) =>
    spotDemandWeight(rules, location, operation.spots[location]),
  );
  const totalWeight = VENDING_LOCATIONS.reduce((total, location) => total + weights[location], 0n);
  if (totalWeight === 0n) return business;
  const served = BigInt(quoteBusinessDay(business, pricing).served);
  const spots = byLocation((location) => {
    const spot = operation.spots[location];
    const sold = Number((served * weights[location]) / totalWeight);
    return { ...spot, stock: Math.max(0, spot.stock - sold) };
  });
  return withSpots(business, { operation, spots });
}

export type Restocking = { readonly spots: VendingSpots; readonly spentCents: bigint };

export function restockSpots(
  running: RunningVending,
  order: { readonly locations: readonly VendingLocation[]; readonly budgetCents: bigint },
): Restocking {
  const { rules } = running;
  return order.locations.reduce<Restocking>(
    (sofar, location) => {
      const spot = sofar.spots[location];
      const cost = restockCents(rules, { location, spot });
      if (cost === 0n || sofar.spentCents + cost > order.budgetCents) return sofar;
      const filled = { ...spot, stock: fullStock(rules, spot.machines) };
      return { spots: { ...sofar.spots, [location]: filled }, spentCents: sofar.spentCents + cost };
    },
    { spots: running.operation.spots, spentCents: 0n },
  );
}

export function restockedByStaff(business: OwnedBusiness, pricing: BusinessPricing): OwnedBusiness {
  const running = runningVending(business, pricing);
  const idle = business.status === 'closed' || business.staff.operations === 0;
  if (running === undefined || idle) return business;
  const restocking = restockSpots(running, {
    locations: VENDING_LOCATIONS,
    budgetCents: business.treasuryCents,
  });
  return {
    ...withSpots(business, { operation: running.operation, spots: restocking.spots }),
    treasuryCents: moneyCents(business.treasuryCents - restocking.spentCents),
  };
}

export function withBestMixes(business: OwnedBusiness, pricing: BusinessPricing): OwnedBusiness {
  const running = runningVending(business, pricing);
  if (running === undefined) return business;
  const { rules, operation } = running;
  const spots = byLocation((location) => ({
    ...operation.spots[location],
    mix: bestMix(rules, location),
  }));
  return withSpots(business, { operation, spots });
}
