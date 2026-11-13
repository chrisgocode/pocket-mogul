import { drawInt, type InclusiveRange } from '@/domain/marketRandom';

import {
  LAUNCH_WEATHERS,
  type LaunchWeather,
  type PayloadOffer,
  type SpaceRules,
} from './spaceRules';

export type SpaceDraw = {
  readonly seed: string;
  readonly businessId: string;
  readonly rules: SpaceRules;
};

const BASIS_POINTS = 10_000;
const WEATHER_STREAM = 'launch_weather';
const PAYLOAD_STREAM = 'payload';
const ROLL: InclusiveRange = [0, BASIS_POINTS - 1];
const RATE_STEP_BPS = 500;
const FALLBACK_WEATHER: LaunchWeather = 'clear';

export function launchWeatherOn(draw: SpaceDraw, day: number): LaunchWeather {
  const roll = drawInt(
    { seed: draw.seed, tick: day, scope: draw.businessId, stream: WEATHER_STREAM },
    ROLL,
  );
  const chances = draw.rules.weatherChanceBps;
  const reached = LAUNCH_WEATHERS.map((_, index) =>
    LAUNCH_WEATHERS.slice(0, index + 1).reduce((total, each) => total + chances[each], 0),
  );
  return LAUNCH_WEATHERS[reached.findIndex((threshold) => roll < threshold)] ?? FALLBACK_WEATHER;
}

export function launchForecast(draw: SpaceDraw, day: number): readonly LaunchWeather[] {
  return Array.from({ length: draw.rules.forecastDays }, (_, index) =>
    launchWeatherOn(draw, day + index + 1),
  );
}

export function payloadOfferOn(draw: SpaceDraw, day: number): PayloadOffer {
  const { payloads } = draw.rules;
  const id = Math.floor(day / payloads.offerDays);
  const roll = (part: string, max: number) =>
    drawInt(
      { seed: draw.seed, tick: id, scope: `${draw.businessId}:${part}`, stream: PAYLOAD_STREAM },
      [0, max],
    );
  const rateSteps = Math.floor((payloads.rateBps.max - payloads.rateBps.min) / RATE_STEP_BPS);
  const client = payloads.clients[roll('client', payloads.clients.length - 1)];
  const size = payloads.sizePercents[roll('size', payloads.sizePercents.length - 1)];
  return {
    id,
    clientId: client?.id ?? '',
    sizePercent: size ?? 0,
    rateBps: payloads.rateBps.min + roll('rate', rateSteps) * RATE_STEP_BPS,
    days: payloads.days.min + roll('days', payloads.days.max - payloads.days.min),
  };
}
