import { profitPerDayCents, quoteBusinessDay } from '@/domain/business/core';
import type { BusinessPricing } from '@/domain/business/definition';
import { withJumboShare } from '@/domain/business/laundromat';
import {
  jumboPool,
  laundromatRulesOf,
  runningLaundromat,
  serviceFeesCents,
  serviceLoads,
  staffedServiceLevel,
  type RunningLaundromat,
} from '@/domain/business/laundromatDemand';
import { quotePickup, type PickupQuote } from '@/domain/business/laundromatQuotes';
import type { OwnedBusiness } from '@/domain/business/owned';
import { serveWithRush } from '@/domain/business/rush';
import type { CoachMark } from '@/domain/coachMarks';
import { moneyCents, type MoneyCents } from '@/domain/money';

import { affordability, type Affordability } from './affordability';

const BPS_PER_PERCENT = 100;
const LAUNDROMAT_COACH_MARK: CoachMark = 'laundromat';

export type JumboView = {
  readonly percent: number;
  readonly customers: number;
  readonly served: number;
  readonly pricePercent: number;
};

export type JumboShareView = {
  readonly percent: number;
  readonly profitCents: MoneyCents;
  readonly best: boolean;
};

export type ServiceLevelView = {
  readonly level: number;
  readonly loads: number;
  readonly feesCents: MoneyCents;
  readonly profitCents: MoneyCents;
};

export type ServiceView = {
  readonly level: number;
  readonly attendants: number;
  readonly maxLevel: number;
  readonly levels: readonly ServiceLevelView[];
};

export type AvailablePickup = Extract<PickupQuote, { status: 'available' }> & Affordability;
export type PickupOption = Exclude<PickupQuote, { status: 'available' }> | AvailablePickup;

export type LaundromatView =
  | { readonly status: 'locked'; readonly unlockStage: number }
  | {
      readonly status: 'active';
      readonly unlockStage: number;
      readonly jumbo: JumboView;
      readonly jumboShares: readonly JumboShareView[];
      readonly service: ServiceView;
      readonly coachMark: 'show' | 'seen';
      readonly pickup: PickupOption;
    };

type LaundromatContext = {
  readonly owned: OwnedBusiness;
  readonly pricing: BusinessPricing;
  readonly seenCoachMarks: readonly string[];
};

function jumboView(running: RunningLaundromat, context: LaundromatContext): JumboView {
  const quote = quoteBusinessDay(context.owned, context.pricing);
  const serving = serveWithRush(
    { demand: BigInt(quote.demand), capacity: BigInt(quote.capacity) },
    jumboPool(running),
  );
  return {
    percent: running.operation.jumboPercent,
    customers: Number(serving.rushCustomers),
    served: Number(serving.rushServed),
    pricePercent: running.rules.jumbo.priceBps / BPS_PER_PERCENT,
  };
}

function jumboShares(running: RunningLaundromat, context: LaundromatContext): JumboShareView[] {
  const { owned, pricing } = context;
  const { operation, rules } = running;
  const profits = rules.jumbo.sharePercents.map((jumboPercent) =>
    profitPerDayCents(withJumboShare(owned, { operation, jumboPercent }), pricing),
  );
  const best = profits.reduce((top, profit) => (profit > top ? profit : top));
  return rules.jumbo.sharePercents.map((percent, index) => ({
    percent,
    profitCents: profits[index] ?? best,
    best: profits[index] === best,
  }));
}

function serviceView(running: RunningLaundromat, context: LaundromatContext): ServiceView {
  const { owned, pricing } = context;
  const { operation, rules } = running;
  const attendants = owned.staff.operations;
  const maxLevel = Math.min(rules.service.priceBpsByLevel.length, attendants);
  const levels = Array.from({ length: maxLevel + 1 }, (_, level) => {
    const laundromat = { ...operation, serviceLevel: level };
    const serving = { ...pricing, running: { rules, operation: laundromat } };
    return {
      level,
      loads: Number(serviceLoads(owned, serving)),
      feesCents: moneyCents(serviceFeesCents(owned, serving)),
      profitCents: profitPerDayCents({ ...owned, laundromat }, pricing),
    };
  });
  return { level: staffedServiceLevel(owned, running), attendants, maxLevel, levels };
}

function pickupOption(context: LaundromatContext): PickupOption {
  const quote = quotePickup(context.owned, context.pricing);
  if (quote === undefined || quote.status !== 'available') {
    return quote ?? { status: 'installed' };
  }
  return { ...quote, ...affordability(quote.priceCents, context.owned.treasuryCents) };
}

export function selectLaundromat(context: LaundromatContext): LaundromatView | undefined {
  const { owned, pricing } = context;
  const rules = laundromatRulesOf(pricing);
  if (rules === undefined) return undefined;
  const running = runningLaundromat(owned, pricing);
  if (running === undefined) return { status: 'locked', unlockStage: rules.unlockStage };
  return {
    status: 'active',
    unlockStage: rules.unlockStage,
    jumbo: jumboView(running, context),
    jumboShares: jumboShares(running, context),
    service: serviceView(running, context),
    coachMark: context.seenCoachMarks.includes(LAUNDROMAT_COACH_MARK) ? 'seen' : 'show',
    pickup: pickupOption(context),
  };
}
