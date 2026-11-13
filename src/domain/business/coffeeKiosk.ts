import { coffeeKioskRulesOf, runningCoffeeKiosk } from './coffeeKioskDemand';
import { RUSH_PLANS, type ActiveCoffeeKiosk, type RushPlan } from './coffeeKioskRules';
import { profitPerDayCents } from './core';
import type { BusinessPricing } from './definition';
import type { OwnedBusiness } from './owned';

export function withCoffeeKioskUnlocked(
  business: OwnedBusiness,
  pricing: BusinessPricing,
): OwnedBusiness {
  const rules = coffeeKioskRulesOf(pricing);
  if (rules === undefined || business.coffeeKiosk.status === 'active') return business;
  if (business.stage < rules.unlockStage) return business;
  const coffeeKiosk: ActiveCoffeeKiosk = {
    status: 'active',
    grade: rules.defaultGrade,
    plan: rules.defaultPlan,
    orderAhead: 'none',
  };
  return { ...business, coffeeKiosk };
}

export function withRushPlan(
  business: OwnedBusiness,
  change: { readonly operation: ActiveCoffeeKiosk; readonly plan: RushPlan },
): OwnedBusiness {
  return { ...business, coffeeKiosk: { ...change.operation, plan: change.plan } };
}

export function bestRushPlan(business: OwnedBusiness, pricing: BusinessPricing): RushPlan {
  const running = runningCoffeeKiosk(business, pricing);
  if (running === undefined) return RUSH_PLANS[0];
  const { operation } = running;
  const current = { plan: operation.plan, profit: profitPerDayCents(business, pricing) };
  return RUSH_PLANS.filter((plan) => plan !== operation.plan).reduce((best, plan) => {
    const profit = profitPerDayCents(withRushPlan(business, { operation, plan }), pricing);
    return profit > best.profit ? { plan, profit } : best;
  }, current).plan;
}

export function withBestRushPlan(business: OwnedBusiness, pricing: BusinessPricing): OwnedBusiness {
  const running = runningCoffeeKiosk(business, pricing);
  if (running === undefined) return business;
  const plan = bestRushPlan(business, pricing);
  return withRushPlan(business, { operation: running.operation, plan });
}
