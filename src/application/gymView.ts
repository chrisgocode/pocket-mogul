import { bayCapacity } from '@/domain/business/core';
import type { BusinessPricing } from '@/domain/business/definition';
import { gymJoinsPerDay, gymLeaversPerDay, gymMemberLimit } from '@/domain/business/gym';
import {
  churnBps,
  gymRulesOf,
  memberVisits,
  runningGym,
  type RunningGym,
} from '@/domain/business/gymDemand';
import { quoteAllHours, type AllHoursQuote } from '@/domain/business/gymQuotes';
import { GYM_TIERS, type GymTier } from '@/domain/business/gymRules';
import type { OwnedBusiness } from '@/domain/business/owned';
import type { CoachMark } from '@/domain/coachMarks';
import type { MoneyCents } from '@/domain/money';

import { affordability, type Affordability } from './affordability';

const BASIS_POINTS = 10_000;
const GYM_COACH_MARK: CoachMark = 'gym';

export type GymMembersView = {
  readonly members: number;
  readonly limit: number;
  readonly joinsPerDay: number;
  readonly leaversPerDay: number;
  readonly visits: number;
  readonly studioVisits: number;
};

export type GymTierView = {
  readonly tier: GymTier;
  readonly feeCents: MoneyCents;
  readonly churnBps: number;
  readonly steadyMembers: number;
};

export type ClassesView = {
  readonly level: number;
  readonly maxLevel: number;
  readonly churnCutBps: number;
  readonly studioPercent: number;
};

export type AvailableAllHours = Extract<AllHoursQuote, { status: 'available' }> & Affordability;
export type AllHoursOption = Exclude<AllHoursQuote, { status: 'available' }> | AvailableAllHours;

export type GymView =
  | { readonly status: 'locked'; readonly unlockStage: number }
  | {
      readonly status: 'active';
      readonly unlockStage: number;
      readonly membership: GymMembersView;
      readonly tier: GymTier;
      readonly tiers: readonly GymTierView[];
      readonly classes: ClassesView;
      readonly coachMark: 'show' | 'seen';
      readonly allHours: AllHoursOption;
    };

type GymContext = {
  readonly owned: OwnedBusiness;
  readonly pricing: BusinessPricing;
  readonly seenCoachMarks: readonly string[];
};

function membersView(running: RunningGym, context: GymContext): GymMembersView {
  const { owned, pricing } = context;
  return {
    members: running.operation.members,
    limit: gymMemberLimit(owned, pricing),
    joinsPerDay: gymJoinsPerDay(owned, pricing),
    leaversPerDay: gymLeaversPerDay(running),
    visits: Number(memberVisits(running)),
    studioVisits: bayCapacity(owned, pricing),
  };
}

function tierViews(running: RunningGym, context: GymContext): GymTierView[] {
  const { owned, pricing } = context;
  const joins = gymJoinsPerDay(owned, pricing);
  const limit = gymMemberLimit(owned, pricing);
  return GYM_TIERS.map((tier) => {
    const leaving = churnBps({ ...running, operation: { ...running.operation, tier } });
    return {
      tier,
      feeCents: running.rules.tiers[tier].feeCents,
      churnBps: leaving,
      steadyMembers: Math.min(limit, Math.floor((joins * BASIS_POINTS) / leaving)),
    };
  });
}

function allHoursOption(context: GymContext): AllHoursOption {
  const quote = quoteAllHours(context.owned, context.pricing);
  if (quote === undefined || quote.status !== 'available') {
    return quote ?? { status: 'installed' };
  }
  return { ...quote, ...affordability(quote.priceCents, context.owned.treasuryCents) };
}

export function selectGym(context: GymContext): GymView | undefined {
  const { owned, pricing } = context;
  const rules = gymRulesOf(pricing);
  if (rules === undefined) return undefined;
  const running = runningGym(owned, pricing);
  if (running === undefined) return { status: 'locked', unlockStage: rules.unlockStage };
  return {
    status: 'active',
    unlockStage: rules.unlockStage,
    membership: membersView(running, context),
    tier: running.operation.tier,
    tiers: tierViews(running, context),
    classes: {
      level: running.operation.classLevel,
      maxLevel: rules.classes.maxLevel,
      churnCutBps: rules.classes.churnCutBps,
      studioPercent: rules.classes.studioPercent,
    },
    coachMark: context.seenCoachMarks.includes(GYM_COACH_MARK) ? 'seen' : 'show',
    allHours: allHoursOption(context),
  };
}
