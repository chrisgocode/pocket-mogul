import { bayCapacity } from './core';
import { carWashRulesOf, runningCarWash, type RunningCarWash } from './carWashDemand';
import type { ActiveCarWash } from './carWashState';
import { forecastAfter, weatherOn, type WeatherDraw } from './carWashWeather';
import type { BusinessPricing } from './definition';
import type { OwnedBusiness } from './owned';

export type CarWashDayStart = {
  readonly pricing: BusinessPricing;
  readonly seed: string;
  readonly day: number;
};

const PERCENT = 100n;
const BASIS_POINTS = 10_000n;

export function weatherDraw(
  business: OwnedBusiness,
  start: { readonly pricing: BusinessPricing; readonly seed: string },
): WeatherDraw | undefined {
  const rules = carWashRulesOf(start.pricing);
  if (rules === undefined) return undefined;
  return { seed: start.seed, businessId: business.definitionId, rules };
}

export function withCarWashUnlocked(
  business: OwnedBusiness,
  start: CarWashDayStart,
): OwnedBusiness {
  const draw = weatherDraw(business, start);
  if (draw === undefined || business.carWash.status === 'active') return business;
  if (business.stage < draw.rules.unlockStage) return business;
  const carWash: ActiveCarWash = {
    status: 'active',
    weather: weatherOn(draw, start.day),
    packages: { deluxe: 'offered', ultimate: 'offered' },
    members: 0,
    membershipLevel: start.pricing.rules.defaultPriceLevel,
    memberCapPercent: draw.rules.memberships.defaultCapPercent,
    detailing: 'none',
  };
  return { ...business, carWash };
}

export function memberLimit(business: OwnedBusiness, pricing: BusinessPricing): number {
  const running = runningCarWash(business, pricing);
  if (running === undefined) return 0;
  const bays = BigInt(bayCapacity(business, pricing));
  const capped = (bays * BigInt(running.operation.memberCapPercent)) / PERCENT;
  return Number((capped * BASIS_POINTS) / BigInt(running.rules.memberships.bayBps));
}

export function joinsPerDay(business: OwnedBusiness, pricing: BusinessPricing): number {
  const running = runningCarWash(business, pricing);
  if (running === undefined) return 0;
  const { rules, definition } = pricing;
  const quality = PERCENT + BigInt(rules.qualityDemandPercent * business.levels.quality);
  const levelBps = BigInt(definition.demandBps[running.operation.membershipLevel]);
  const base = BigInt(running.rules.memberships.joinsPerUnit * business.units);
  return Number((base * quality * levelBps) / (PERCENT * BASIS_POINTS));
}

function managedCap(running: RunningCarWash, forecast: { draw: WeatherDraw; day: number }) {
  const rainAhead = forecastAfter(forecast.draw, forecast.day).includes('rain');
  const caps = running.rules.memberships.managerCapPercent;
  return rainAhead ? caps.rainAhead : caps.clear;
}

function withWeather(business: OwnedBusiness, start: CarWashDayStart): OwnedBusiness {
  const running = runningCarWash(business, start.pricing);
  const draw = weatherDraw(business, start);
  if (running === undefined || draw === undefined) return business;
  const weather = weatherOn(draw, start.day);
  const managed = business.staff.manager > 0 && business.status === 'open';
  const memberCapPercent = managed
    ? managedCap(running, { draw, day: start.day })
    : running.operation.memberCapPercent;
  return { ...business, carWash: { ...running.operation, weather, memberCapPercent } };
}

function withMembers(business: OwnedBusiness, pricing: BusinessPricing): OwnedBusiness {
  const running = runningCarWash(business, pricing);
  if (running === undefined || business.status === 'closed') return business;
  const limit = memberLimit(business, pricing);
  const joined = running.operation.members + joinsPerDay(business, pricing);
  const members = Math.min(limit, joined);
  return { ...business, carWash: { ...running.operation, members } };
}

export function startCarWashDay(business: OwnedBusiness, start: CarWashDayStart): OwnedBusiness {
  const unlocked = withCarWashUnlocked(business, start);
  return withMembers(withWeather(unlocked, start), start.pricing);
}
