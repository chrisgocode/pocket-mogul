import type { ActiveCoffeeKiosk, CoffeeKioskRules } from './coffeeKioskRules';
import type { BusinessPricing } from './definition';
import type { OwnedBusiness } from './owned';
import type { RushDay } from './rush';

export type RunningCoffeeKiosk = {
  readonly rules: CoffeeKioskRules;
  readonly operation: ActiveCoffeeKiosk;
};

const PERCENT = 100n;
const BASIS_POINTS = 10_000n;

export function coffeeKioskRulesOf(pricing: BusinessPricing): CoffeeKioskRules | undefined {
  const { mechanic } = pricing.definition;
  return mechanic.kind === 'coffee_kiosk' ? mechanic.coffeeKiosk : undefined;
}

export function runningCoffeeKiosk(
  business: OwnedBusiness,
  pricing: BusinessPricing,
): RunningCoffeeKiosk | undefined {
  const rules = coffeeKioskRulesOf(pricing);
  const operation = business.coffeeKiosk;
  if (rules === undefined || operation.status !== 'active') return undefined;
  return { rules, operation };
}

export type CoffeeKioskDay = {
  readonly demandBps: bigint;
  readonly priceBps: bigint;
  readonly costBps: bigint;
  readonly rush: RushDay;
};

function rushOf(running: RunningCoffeeKiosk): RushDay {
  const { rules, operation } = running;
  const installed = operation.orderAhead === 'installed';
  const orderAhead = PERCENT + BigInt(installed ? rules.orderAhead.rushCapacityPercent : 0);
  return {
    demandShareBps: BigInt(rules.rushDemandBps),
    windowBps: BigInt(rules.rushWindowBps),
    boostBps: (BigInt(rules.plans[operation.plan].rushCapacityBps) * orderAhead) / PERCENT,
    priceBps: BASIS_POINTS,
  };
}

export function coffeeKioskDay(running: RunningCoffeeKiosk): CoffeeKioskDay {
  const grade = running.rules.grades[running.operation.grade];
  const plan = running.rules.plans[running.operation.plan];
  return {
    demandBps: (BigInt(grade.demandBps) * BigInt(plan.demandBps)) / BASIS_POINTS,
    priceBps: (BigInt(grade.priceBps) * BigInt(plan.priceBps)) / BASIS_POINTS,
    costBps: BigInt(grade.costBps),
    rush: rushOf(running),
  };
}
