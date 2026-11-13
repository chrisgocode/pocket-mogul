import type { BusinessPricing } from './definition';
import type { ActiveGym, GymRules } from './gymRules';
import type { OwnedBusiness } from './owned';

export type RunningGym = { readonly rules: GymRules; readonly operation: ActiveGym };

const PERCENT = 100n;
const BPS_PER_PERCENT = 100n;
const BASIS_POINTS = 10_000n;

export function gymRulesOf(pricing: BusinessPricing): GymRules | undefined {
  const { mechanic } = pricing.definition;
  return mechanic.kind === 'gym' ? mechanic.gym : undefined;
}

export function runningGym(
  business: OwnedBusiness,
  pricing: BusinessPricing,
): RunningGym | undefined {
  const rules = gymRulesOf(pricing);
  const operation = business.gym;
  if (rules === undefined || operation.status !== 'active') return undefined;
  return { rules, operation };
}

export function churnBps(running: RunningGym): number {
  const { rules, operation } = running;
  const cut = rules.classes.churnCutBps * operation.classLevel;
  return Math.max(0, rules.tiers[operation.tier].churnBps - cut);
}

export function memberVisits(running: RunningGym): bigint {
  return (BigInt(running.operation.members) * BigInt(running.rules.visitBps)) / BASIS_POINTS;
}

export type GymDay = {
  readonly capacityBps: bigint;
  readonly memberBay: bigint;
  readonly memberFeesCents: bigint;
};

export function gymDay(running: RunningGym): GymDay {
  const { rules, operation } = running;
  const installed = operation.allHours === 'installed';
  const hours = PERCENT + BigInt(installed ? rules.allHours.capacityPercent : 0);
  const open = PERCENT - BigInt(rules.classes.studioPercent * operation.classLevel);
  return {
    capacityBps: (open * hours * BPS_PER_PERCENT) / PERCENT,
    memberBay: memberVisits(running),
    memberFeesCents: BigInt(operation.members) * rules.tiers[operation.tier].feeCents,
  };
}
