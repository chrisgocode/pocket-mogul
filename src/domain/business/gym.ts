import { bayCapacity, quoteBusinessDay } from './core';
import type { BusinessPricing } from './definition';
import { churnBps, gymRulesOf, runningGym, type RunningGym } from './gymDemand';
import type { ActiveGym } from './gymRules';
import type { OwnedBusiness } from './owned';

const PERCENT = 100n;
const BASIS_POINTS = 10_000n;

export function withGymUnlocked(business: OwnedBusiness, pricing: BusinessPricing): OwnedBusiness {
  const rules = gymRulesOf(pricing);
  if (rules === undefined || business.gym.status === 'active') return business;
  if (business.stage < rules.unlockStage) return business;
  const gym: ActiveGym = {
    status: 'active',
    members: 0,
    tier: rules.defaultTier,
    classLevel: 0,
    allHours: 'none',
  };
  return { ...business, gym };
}

export function gymJoinsPerDay(business: OwnedBusiness, pricing: BusinessPricing): number {
  const running = runningGym(business, pricing);
  if (running === undefined) return 0;
  const quality = PERCENT + BigInt(pricing.rules.qualityDemandPercent * business.levels.quality);
  const base = BigInt(running.rules.joinsPerUnit * business.units);
  return Number((base * quality) / PERCENT);
}

export function gymMemberLimit(business: OwnedBusiness, pricing: BusinessPricing): number {
  const running = runningGym(business, pricing);
  if (running === undefined) return 0;
  const studio = BigInt(bayCapacity(business, pricing));
  return Number((studio * BASIS_POINTS) / BigInt(running.rules.visitBps));
}

export function gymLeaversPerDay(running: RunningGym): number {
  return Number((BigInt(running.operation.members) * BigInt(churnBps(running))) / BASIS_POINTS);
}

function withMembers(business: OwnedBusiness, pricing: BusinessPricing): OwnedBusiness {
  const running = runningGym(business, pricing);
  if (running === undefined || business.status === 'closed') return business;
  const stayed = running.operation.members - gymLeaversPerDay(running);
  const joined = stayed + gymJoinsPerDay(business, pricing);
  const members = Math.min(gymMemberLimit(business, pricing), joined);
  return { ...business, gym: { ...running.operation, members } };
}

function managedClasses(business: OwnedBusiness, pricing: BusinessPricing): OwnedBusiness {
  const running = runningGym(business, pricing);
  const managed = business.staff.manager > 0 && business.status === 'open';
  if (running === undefined || !managed) return business;
  const quote = quoteBusinessDay(business, pricing);
  const step = quote.demand > quote.capacity ? -1 : 1;
  const level = running.operation.classLevel + step;
  const classLevel = Math.min(running.rules.classes.maxLevel, Math.max(0, level));
  return { ...business, gym: { ...running.operation, classLevel } };
}

export function startGymDay(business: OwnedBusiness, pricing: BusinessPricing): OwnedBusiness {
  const unlocked = withGymUnlocked(business, pricing);
  return managedClasses(withMembers(unlocked, pricing), pricing);
}
