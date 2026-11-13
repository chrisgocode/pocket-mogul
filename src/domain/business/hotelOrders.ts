import type { PriceLevel } from './definition';
import type { Season } from './hotelRules';

export type SetSeasonRate = {
  readonly type: 'SetSeasonRate';
  readonly businessId: string;
  readonly season: Season;
  readonly priceLevel: PriceLevel;
};

export type InstallConference = {
  readonly type: 'InstallConference';
  readonly businessId: string;
};

export type HotelCommand = SetSeasonRate | InstallConference;
