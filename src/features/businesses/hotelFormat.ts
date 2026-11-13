import type { AvailableConference } from '@/application/hotelView';
import type { PriceLevel } from '@/domain/business/definition';
import type { Season } from '@/domain/business/hotelRules';

export const SEASON_NAMES: Readonly<Record<Season, string>> = {
  low: 'Low season',
  shoulder: 'Shoulder season',
  high: 'High season',
  event: 'Event season',
};

export type HotelActions = {
  readonly setSeasonRate: (change: { season: Season; priceLevel: PriceLevel }) => void;
  readonly dismissCoachMark: () => void;
  readonly installConference: (conference: AvailableConference) => void;
};

export const inDaysText = (days: number) => (days === 1 ? 'in 1 day' : `in ${days} days`);
