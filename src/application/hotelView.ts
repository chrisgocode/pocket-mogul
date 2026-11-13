import { businessDayOf, type BusinessPricing, type PriceLevel } from '@/domain/business/definition';
import { seasonDraw } from '@/domain/business/hotel';
import {
  hotelRulesOf,
  housekeepersNeeded,
  runningHotel,
  starRating,
} from '@/domain/business/hotelDemand';
import { quoteConference, type ConferenceQuote } from '@/domain/business/hotelQuotes';
import { SEASONS, type HotelRules, type Season } from '@/domain/business/hotelRules';
import { seasonForecast, type ComingSeason } from '@/domain/business/hotelSeasons';
import type { OwnedBusiness } from '@/domain/business/owned';
import type { CoachMark } from '@/domain/coachMarks';

import { affordability, type Affordability } from './affordability';

const BPS_PER_PERCENT = 100;
const WHOLE_PERCENT = 100;
const HOTEL_COACH_MARK: CoachMark = 'hotel';

export type StarsView = {
  readonly rating: number;
  readonly max: number;
  readonly pricePercent: number;
  readonly housekeepers: number;
  readonly housekeepersNeeded: number;
  readonly qualityPerStar: number;
};

export type SeasonRateView = {
  readonly season: Season;
  readonly guestsPercent: number;
  readonly priceLevel: PriceLevel;
  readonly current: boolean;
};

export type AvailableConference = Extract<ConferenceQuote, { status: 'available' }> & Affordability;
export type ConferenceOption =
  | Exclude<ConferenceQuote, { status: 'available' }>
  | AvailableConference;

export type HotelView =
  | { readonly status: 'locked'; readonly unlockStage: number }
  | {
      readonly status: 'active';
      readonly unlockStage: number;
      readonly season: Season;
      readonly guestsPercent: number;
      readonly forecast: readonly ComingSeason[];
      readonly stars: StarsView;
      readonly rates: readonly SeasonRateView[];
      readonly coachMark: 'show' | 'seen';
      readonly conference: ConferenceOption;
    };

type HotelContext = {
  readonly owned: OwnedBusiness;
  readonly pricing: BusinessPricing;
  readonly seed: string;
  readonly simulationMs: number;
  readonly seenCoachMarks: readonly string[];
};

function starsView(owned: OwnedBusiness, rules: HotelRules): StarsView {
  const rating = starRating(owned, rules);
  return {
    rating,
    max: rules.stars.max,
    pricePercent: WHOLE_PERCENT + (rules.stars.priceBpsPerStar * (rating - 1)) / BPS_PER_PERCENT,
    housekeepers: owned.staff.operations,
    housekeepersNeeded: housekeepersNeeded(owned, rules),
    qualityPerStar: rules.stars.qualityPerStar,
  };
}

function conferenceOption(context: HotelContext): ConferenceOption {
  const quote = quoteConference(context.owned, context.pricing);
  if (quote === undefined || quote.status !== 'available') {
    return quote ?? { status: 'installed' };
  }
  return { ...quote, ...affordability(quote.priceCents, context.owned.treasuryCents) };
}

export function selectHotel(context: HotelContext): HotelView | undefined {
  const { owned, pricing } = context;
  const rules = hotelRulesOf(pricing);
  if (rules === undefined) return undefined;
  const running = runningHotel(owned, pricing);
  const draw = seasonDraw(owned, context);
  if (running === undefined || draw === undefined) {
    return { status: 'locked', unlockStage: rules.unlockStage };
  }
  const { season, rates } = running.operation;
  const day = businessDayOf(context.simulationMs, pricing.rules);
  return {
    status: 'active',
    unlockStage: rules.unlockStage,
    season,
    guestsPercent: rules.seasonDemandBps[season] / BPS_PER_PERCENT,
    forecast: seasonForecast(draw, day),
    stars: starsView(owned, rules),
    rates: SEASONS.map((each) => ({
      season: each,
      guestsPercent: rules.seasonDemandBps[each] / BPS_PER_PERCENT,
      priceLevel: rates[each],
      current: each === season,
    })),
    coachMark: context.seenCoachMarks.includes(HOTEL_COACH_MARK) ? 'seen' : 'show',
    conference: conferenceOption(context),
  };
}
