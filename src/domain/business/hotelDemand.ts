import type { BusinessPricing } from './definition';
import type { ActiveHotel, HotelRules } from './hotelRules';
import type { OwnedBusiness } from './owned';

export type RunningHotel = { readonly rules: HotelRules; readonly operation: ActiveHotel };

const PERCENT = 100n;
const BASIS_POINTS = 10_000n;

export function hotelRulesOf(pricing: BusinessPricing): HotelRules | undefined {
  const { mechanic } = pricing.definition;
  return mechanic.kind === 'hotel' ? mechanic.hotel : undefined;
}

export function runningHotel(
  business: OwnedBusiness,
  pricing: BusinessPricing,
): RunningHotel | undefined {
  const rules = hotelRulesOf(pricing);
  const operation = business.hotel;
  if (rules === undefined || operation.status !== 'active') return undefined;
  return { rules, operation };
}

export function housekeepersNeeded(business: OwnedBusiness, rules: HotelRules): number {
  return Math.ceil(business.units / rules.stars.unitsPerHousekeeper);
}

export function starRating(business: OwnedBusiness, rules: HotelRules): number {
  const { stars } = rules;
  const earned = Math.floor(business.levels.quality / stars.qualityPerStar);
  const kept = business.staff.operations >= housekeepersNeeded(business, rules) ? 1 : 0;
  return Math.min(stars.max, 1 + earned + kept);
}

export type HotelDay = { readonly demandBps: bigint; readonly priceBps: bigint };

export function hotelDay(business: OwnedBusiness, running: RunningHotel): HotelDay {
  const { rules, operation } = running;
  const hosting = operation.conference === 'installed' && operation.season === 'event';
  const conference = PERCENT + BigInt(hosting ? rules.conference.eventDemandPercent : 0);
  const extraStars = starRating(business, rules) - 1;
  return {
    demandBps: (BigInt(rules.seasonDemandBps[operation.season]) * conference) / PERCENT,
    priceBps: BASIS_POINTS + BigInt(rules.stars.priceBpsPerStar * extraStars),
  };
}
