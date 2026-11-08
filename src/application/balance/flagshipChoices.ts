import { weatherDraw } from '@/domain/business/carWash';
import { forecastAfter } from '@/domain/business/carWashWeather';
import { businessDayOf, type BusinessPricing } from '@/domain/business/definition';
import type { OwnedBusiness } from '@/domain/business/owned';
import { spotDemandWeight, vendingRulesOf, bestMix } from '@/domain/business/vendingDemand';
import { VENDING_LOCATIONS } from '@/domain/business/vendingRules';
import type { GameCommand } from '@/domain/commands';

export function membershipCapCommand(
  owned: OwnedBusiness,
  context: {
    pricing: BusinessPricing;
    seed: string;
    atMs: number;
  },
): GameCommand[] {
  const draw = weatherDraw(owned, context);
  if (draw === undefined || owned.carWash.status !== 'active') return [];
  const day = businessDayOf(context.atMs, context.pricing.rules);
  const rain = forecastAfter(draw, day).includes('rain');
  const caps = draw.rules.memberships.managerCapPercent;
  const capPercent = rain ? caps.rainAhead : caps.clear;
  return owned.carWash.memberCapPercent === capPercent
    ? []
    : [
        {
          type: 'SetMemberCap',
          businessId: owned.definitionId,
          capPercent,
        },
      ];
}

export function locationCommand(owned: OwnedBusiness, pricing: BusinessPricing): GameCommand[] {
  const rules = vendingRulesOf(pricing);
  const { vending } = owned;
  if (rules === undefined || vending.status !== 'active') return [];
  const weight = (location: (typeof VENDING_LOCATIONS)[number]) =>
    spotDemandWeight(rules, location, {
      machines: 1,
      mix: bestMix(rules, location),
      stock: rules.stockPerMachine,
    });
  const available = VENDING_LOCATIONS.filter(
    (location) => vending.spots[location].machines < rules.locations[location].slots,
  );
  const target = available.reduce<(typeof VENDING_LOCATIONS)[number] | undefined>(
    (best, location) => (best === undefined || weight(location) > weight(best) ? location : best),
    undefined,
  );
  if (target === undefined) return [];
  const source = VENDING_LOCATIONS.find(
    (location) => vending.spots[location].machines > 0 && weight(location) < weight(target),
  );
  return source === undefined
    ? []
    : [{ type: 'MoveVendingMachine', businessId: owned.definitionId, from: source, to: target }];
}
