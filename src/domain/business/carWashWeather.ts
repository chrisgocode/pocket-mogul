import { drawInt, type InclusiveRange } from '@/domain/marketRandom';

import { DRAWN_WEATHERS, type CarWashRules, type DrawnWeather, type Weather } from './carWashRules';

export type WeatherDraw = {
  readonly seed: string;
  readonly businessId: string;
  readonly rules: CarWashRules;
};

const BASIS_POINTS = 10_000;
const WEATHER_STREAM = 'weather';
const ROLL: InclusiveRange = [0, BASIS_POINTS - 1];

function drawnWeather(draw: WeatherDraw, day: number): DrawnWeather {
  const roll = drawInt(
    { seed: draw.seed, tick: day, scope: draw.businessId, stream: WEATHER_STREAM },
    ROLL,
  );
  const chances = draw.rules.weatherChanceBps;
  const reached = DRAWN_WEATHERS.map((_, index) =>
    DRAWN_WEATHERS.slice(0, index + 1).reduce((total, each) => total + chances[each], 0),
  );
  return DRAWN_WEATHERS[reached.findIndex((threshold) => roll < threshold)] ?? 'cloudy';
}

export function weatherOn(draw: WeatherDraw, day: number): Weather {
  const today = drawnWeather(draw, day);
  if (today !== 'rain' && drawnWeather(draw, day - 1) === 'rain') return 'after_rain';
  return today;
}

export function forecastAfter(draw: WeatherDraw, day: number): readonly Weather[] {
  return Array.from({ length: draw.rules.forecastDays }, (_, index) =>
    weatherOn(draw, day + index + 1),
  );
}
