import type { PriceLevel } from './definition';

export const SEASONS = ['low', 'shoulder', 'high', 'event'] as const;
export type Season = (typeof SEASONS)[number];

export type SeasonBps = Readonly<Record<Season, number>>;

export type StarRules = {
  readonly max: number;
  readonly qualityPerStar: number;
  readonly unitsPerHousekeeper: number;
  readonly priceBpsPerStar: number;
};

export type ConferenceRule = {
  readonly stage: number;
  readonly priceMultiple: number;
  readonly eventDemandPercent: number;
};

export type HotelRules = {
  readonly unlockStage: number;
  readonly seasonDays: number;
  readonly forecastSeasons: number;
  readonly seasonChanceBps: SeasonBps;
  readonly seasonDemandBps: SeasonBps;
  readonly stars: StarRules;
  readonly conference: ConferenceRule;
};

export type RatePlan = Readonly<Record<Season, PriceLevel>>;

export type Conference = 'none' | 'installed';

export type HotelOperation =
  | { readonly status: 'inactive' }
  | {
      readonly status: 'active';
      readonly season: Season;
      readonly rates: RatePlan;
      readonly conference: Conference;
    };

export type ActiveHotel = Extract<HotelOperation, { status: 'active' }>;

export const NO_HOTEL: HotelOperation = { status: 'inactive' };
