import { withRushPlan } from '@/domain/business/coffeeKiosk';
import {
  coffeeKioskDay,
  coffeeKioskRulesOf,
  runningCoffeeKiosk,
  type RunningCoffeeKiosk,
} from '@/domain/business/coffeeKioskDemand';
import { quoteOrderAhead, type OrderAheadQuote } from '@/domain/business/coffeeKioskQuotes';
import {
  BEAN_GRADES,
  RUSH_PLANS,
  type BeanGrade,
  type RushPlan,
} from '@/domain/business/coffeeKioskRules';
import { profitPerDayCents, quoteBusinessDay } from '@/domain/business/core';
import type { BusinessPricing } from '@/domain/business/definition';
import type { OwnedBusiness } from '@/domain/business/owned';
import { serveWithRush } from '@/domain/business/rush';
import type { CoachMark } from '@/domain/coachMarks';
import type { MoneyCents } from '@/domain/money';

import { affordability, type Affordability } from './affordability';

const BPS_PER_PERCENT = 100;
const COFFEE_KIOSK_COACH_MARK: CoachMark = 'coffee_kiosk';

export type RushView = {
  readonly customers: number;
  readonly served: number;
  readonly walkedAway: number;
};

export type BeanGradeView = {
  readonly grade: BeanGrade;
  readonly pricePercent: number;
  readonly costPercent: number;
  readonly customersPercent: number;
  readonly profitCents: MoneyCents;
  readonly best: boolean;
};

export type RushPlanView = {
  readonly plan: RushPlan;
  readonly rushCapacityPercent: number;
  readonly customersPercent: number;
  readonly pricePercent: number;
  readonly profitCents: MoneyCents;
  readonly best: boolean;
};

export type AvailableOrderAhead = Extract<OrderAheadQuote, { status: 'available' }> & Affordability;
export type OrderAheadOption =
  | Exclude<OrderAheadQuote, { status: 'available' }>
  | AvailableOrderAhead;

export type CoffeeKioskView =
  | { readonly status: 'locked'; readonly unlockStage: number }
  | {
      readonly status: 'active';
      readonly unlockStage: number;
      readonly rush: RushView;
      readonly grade: BeanGrade;
      readonly grades: readonly BeanGradeView[];
      readonly plan: RushPlan;
      readonly plans: readonly RushPlanView[];
      readonly coachMark: 'show' | 'seen';
      readonly orderAhead: OrderAheadOption;
    };

type CoffeeKioskContext = {
  readonly owned: OwnedBusiness;
  readonly pricing: BusinessPricing;
  readonly seenCoachMarks: readonly string[];
};

function rushView(running: RunningCoffeeKiosk, context: CoffeeKioskContext): RushView {
  const quote = quoteBusinessDay(context.owned, context.pricing);
  const serving = serveWithRush(
    { demand: BigInt(quote.demand), capacity: BigInt(quote.capacity) },
    coffeeKioskDay(running).rush,
  );
  return {
    customers: Number(serving.rushCustomers),
    served: Number(serving.rushServed),
    walkedAway: Number(serving.rushCustomers - serving.rushServed),
  };
}

const bestOf = (profits: readonly MoneyCents[]) =>
  profits.reduce((best, profit) => (profit > best ? profit : best));

function gradeViews(running: RunningCoffeeKiosk, context: CoffeeKioskContext): BeanGradeView[] {
  const { owned, pricing } = context;
  const profits = BEAN_GRADES.map((grade) =>
    profitPerDayCents({ ...owned, coffeeKiosk: { ...running.operation, grade } }, pricing),
  );
  const best = bestOf(profits);
  return BEAN_GRADES.map((grade, index) => ({
    grade,
    pricePercent: running.rules.grades[grade].priceBps / BPS_PER_PERCENT,
    costPercent: running.rules.grades[grade].costBps / BPS_PER_PERCENT,
    customersPercent: running.rules.grades[grade].demandBps / BPS_PER_PERCENT,
    profitCents: profits[index] ?? best,
    best: profits[index] === best,
  }));
}

function planViews(running: RunningCoffeeKiosk, context: CoffeeKioskContext): RushPlanView[] {
  const { owned, pricing } = context;
  const { operation } = running;
  const profits = RUSH_PLANS.map((plan) =>
    profitPerDayCents(withRushPlan(owned, { operation, plan }), pricing),
  );
  const best = bestOf(profits);
  return RUSH_PLANS.map((plan, index) => ({
    plan,
    rushCapacityPercent: running.rules.plans[plan].rushCapacityBps / BPS_PER_PERCENT,
    customersPercent: running.rules.plans[plan].demandBps / BPS_PER_PERCENT,
    pricePercent: running.rules.plans[plan].priceBps / BPS_PER_PERCENT,
    profitCents: profits[index] ?? best,
    best: profits[index] === best,
  }));
}

function orderAheadOption(context: CoffeeKioskContext): OrderAheadOption {
  const quote = quoteOrderAhead(context.owned, context.pricing);
  if (quote === undefined || quote.status !== 'available') {
    return quote ?? { status: 'installed' };
  }
  return { ...quote, ...affordability(quote.priceCents, context.owned.treasuryCents) };
}

export function selectCoffeeKiosk(context: CoffeeKioskContext): CoffeeKioskView | undefined {
  const { owned, pricing } = context;
  const rules = coffeeKioskRulesOf(pricing);
  if (rules === undefined) return undefined;
  const running = runningCoffeeKiosk(owned, pricing);
  if (running === undefined) return { status: 'locked', unlockStage: rules.unlockStage };
  return {
    status: 'active',
    unlockStage: rules.unlockStage,
    rush: rushView(running, context),
    grade: running.operation.grade,
    grades: gradeViews(running, context),
    plan: running.operation.plan,
    plans: planViews(running, context),
    coachMark: context.seenCoachMarks.includes(COFFEE_KIOSK_COACH_MARK) ? 'seen' : 'show',
    orderAhead: orderAheadOption(context),
  };
}
