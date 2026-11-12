import { bestRushPlan, withRushPlan } from '@/domain/business/coffeeKiosk';
import { runningCoffeeKiosk } from '@/domain/business/coffeeKioskDemand';
import { BEAN_GRADES, type BeanGrade } from '@/domain/business/coffeeKioskRules';
import { profitPerDayCents } from '@/domain/business/core';
import type { BusinessPricing } from '@/domain/business/definition';
import type { OwnedBusiness } from '@/domain/business/owned';
import type { GameCommand } from '@/domain/commands';

export function coffeeKioskCommands(owned: OwnedBusiness, pricing: BusinessPricing): GameCommand[] {
  const running = runningCoffeeKiosk(owned, pricing);
  if (running === undefined) return [];
  const { operation } = running;
  const businessId = owned.definitionId;
  const plan = bestRushPlan(owned, pricing);
  const planned = withRushPlan(owned, { operation, plan });
  const graded = (grade: BeanGrade) => ({
    grade,
    profit: profitPerDayCents({ ...planned, coffeeKiosk: { ...operation, plan, grade } }, pricing),
  });
  const { grade } = BEAN_GRADES.filter((each) => each !== operation.grade)
    .map(graded)
    .reduce((best, each) => (each.profit > best.profit ? each : best), graded(operation.grade));
  const plans: GameCommand[] =
    plan === operation.plan ? [] : [{ type: 'SetRushPlan', businessId, plan }];
  const grades: GameCommand[] =
    grade === operation.grade ? [] : [{ type: 'SetBeanGrade', businessId, grade }];
  return [...plans, ...grades];
}
