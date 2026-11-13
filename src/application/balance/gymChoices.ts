import { quoteBusinessDay } from '@/domain/business/core';
import type { BusinessPricing } from '@/domain/business/definition';
import { churnBps, runningGym, type RunningGym } from '@/domain/business/gymDemand';
import { GYM_TIERS, type GymTier } from '@/domain/business/gymRules';
import type { OwnedBusiness } from '@/domain/business/owned';
import type { GameCommand } from '@/domain/commands';

const BASIS_POINTS = 10_000n;

function roomyClassLevel(owned: OwnedBusiness, running: RunningGym, pricing: BusinessPricing) {
  const levels = Array.from({ length: running.rules.classes.maxLevel + 1 }, (_, level) => level);
  return levels.reduce((best, classLevel) => {
    const gym = { ...running.operation, classLevel };
    const quote = quoteBusinessDay({ ...owned, gym }, pricing);
    return quote.demand <= quote.capacity ? classLevel : best;
  }, 0);
}

function steadiestTier(running: RunningGym, classLevel: number): GymTier {
  const income = (tier: GymTier) => {
    const operation = { ...running.operation, tier, classLevel };
    const fee = running.rules.tiers[tier].feeCents;
    return (fee * BASIS_POINTS) / BigInt(Math.max(1, churnBps({ ...running, operation })));
  };
  return GYM_TIERS.reduce((best, tier) => (income(tier) > income(best) ? tier : best));
}

export function gymCommands(owned: OwnedBusiness, pricing: BusinessPricing): GameCommand[] {
  const running = runningGym(owned, pricing);
  if (running === undefined) return [];
  const { operation } = running;
  const businessId = owned.definitionId;
  const level = roomyClassLevel(owned, running, pricing);
  const tier = steadiestTier(running, level);
  const tiers: GameCommand[] =
    tier === operation.tier ? [] : [{ type: 'SetGymTier', businessId, tier }];
  const classes: GameCommand[] =
    level === operation.classLevel ? [] : [{ type: 'SetClassLevel', businessId, level }];
  return [...tiers, ...classes];
}
