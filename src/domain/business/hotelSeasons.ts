import { drawInt, type InclusiveRange } from '@/domain/marketRandom';

import { SEASONS, type HotelRules, type Season } from './hotelRules';

export type SeasonDraw = {
  readonly seed: string;
  readonly businessId: string;
  readonly rules: HotelRules;
};

const BASIS_POINTS = 10_000;
const SEASON_STREAM = 'season';
const ROLL: InclusiveRange = [0, BASIS_POINTS - 1];
const FALLBACK_SEASON: Season = 'shoulder';

function seasonOfBlock(draw: SeasonDraw, block: number): Season {
  const roll = drawInt(
    { seed: draw.seed, tick: block, scope: draw.businessId, stream: SEASON_STREAM },
    ROLL,
  );
  const chances = draw.rules.seasonChanceBps;
  const reached = SEASONS.map((_, index) =>
    SEASONS.slice(0, index + 1).reduce((total, each) => total + chances[each], 0),
  );
  return SEASONS[reached.findIndex((threshold) => roll < threshold)] ?? FALLBACK_SEASON;
}

const blockOf = (draw: SeasonDraw, day: number) => Math.floor(day / draw.rules.seasonDays);

export function seasonOn(draw: SeasonDraw, day: number): Season {
  return seasonOfBlock(draw, blockOf(draw, day));
}

export type ComingSeason = { readonly season: Season; readonly inDays: number };

export function seasonForecast(draw: SeasonDraw, day: number): readonly ComingSeason[] {
  const block = blockOf(draw, day);
  return Array.from({ length: draw.rules.forecastSeasons }, (_, index) => ({
    season: seasonOfBlock(draw, block + index + 1),
    inDays: (block + index + 1) * draw.rules.seasonDays - day,
  }));
}
