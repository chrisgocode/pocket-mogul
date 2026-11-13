import { drawInt, type InclusiveRange } from '@/domain/marketRandom';

import { FUEL_LEVELS, type AirlineRules, type FuelLevel } from './airlineRules';

export type FuelDraw = {
  readonly seed: string;
  readonly businessId: string;
  readonly rules: AirlineRules;
};

const BASIS_POINTS = 10_000;
const FUEL_STREAM = 'fuel';
const ROLL: InclusiveRange = [0, BASIS_POINTS - 1];
const FALLBACK_FUEL: FuelLevel = 'normal';

export function fuelOn(draw: FuelDraw, day: number): FuelLevel {
  const roll = drawInt(
    { seed: draw.seed, tick: day, scope: draw.businessId, stream: FUEL_STREAM },
    ROLL,
  );
  const chances = draw.rules.fuelChanceBps;
  const reached = FUEL_LEVELS.map((_, index) =>
    FUEL_LEVELS.slice(0, index + 1).reduce((total, each) => total + chances[each], 0),
  );
  return FUEL_LEVELS[reached.findIndex((threshold) => roll < threshold)] ?? FALLBACK_FUEL;
}

export function fuelForecast(draw: FuelDraw, day: number): readonly FuelLevel[] {
  return Array.from({ length: draw.rules.forecastDays }, (_, index) =>
    fuelOn(draw, day + index + 1),
  );
}
