import type { BusinessPricing } from './definition';
import { hotelRulesOf, runningHotel } from './hotelDemand';
import type { ActiveHotel } from './hotelRules';
import { seasonOn, type SeasonDraw } from './hotelSeasons';
import type { OwnedBusiness } from './owned';

export type HotelDayStart = {
  readonly pricing: BusinessPricing;
  readonly seed: string;
  readonly day: number;
};

export function seasonDraw(
  business: OwnedBusiness,
  start: { readonly pricing: BusinessPricing; readonly seed: string },
): SeasonDraw | undefined {
  const rules = hotelRulesOf(start.pricing);
  if (rules === undefined) return undefined;
  return { seed: start.seed, businessId: business.definitionId, rules };
}

export function withHotelUnlocked(business: OwnedBusiness, start: HotelDayStart): OwnedBusiness {
  const draw = seasonDraw(business, start);
  if (draw === undefined || business.hotel.status === 'active') return business;
  if (business.stage < draw.rules.unlockStage) return business;
  const rate = business.priceLevel;
  const hotel: ActiveHotel = {
    status: 'active',
    season: seasonOn(draw, start.day),
    rates: { low: rate, shoulder: rate, high: rate, event: rate },
    conference: 'none',
  };
  return { ...business, hotel };
}

export function startHotelDay(business: OwnedBusiness, start: HotelDayStart): OwnedBusiness {
  const unlocked = withHotelUnlocked(business, start);
  const running = runningHotel(unlocked, start.pricing);
  const draw = seasonDraw(unlocked, start);
  if (running === undefined || draw === undefined) return unlocked;
  const season = seasonOn(draw, start.day);
  if (season === running.operation.season) return unlocked;
  const hotel = { ...running.operation, season };
  return { ...unlocked, priceLevel: hotel.rates[season], hotel };
}
