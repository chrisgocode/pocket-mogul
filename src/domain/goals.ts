import type { CollectionEconomy, CollectionMeasure } from './collection/rules';
import { collectionProgress } from './collection/sets';
import type { CommandResult } from './commands';
import type { GameState } from './gameState';
import type { MarketInstrument } from './marketRules';
import { moneyCents, type MoneyCents } from './money';

export type FirstAction =
  | 'wallet_upgrade'
  | 'business_purchase'
  | 'rental_started'
  | 'stock_purchase'
  | 'crypto_purchase'
  | 'dividend_received';

export type GoalDefinition =
  | { readonly id: string; readonly kind: 'first_action'; readonly action: FirstAction }
  | { readonly id: string; readonly kind: 'peak_net_worth'; readonly threshold: MoneyCents }
  | {
      readonly id: string;
      readonly kind: 'collection';
      readonly measure: CollectionMeasure;
      readonly count: number;
    };

export type CompletedGoal = { readonly goalId: string; readonly simulationMs: number };

export type GoalProgress = {
  readonly completed: readonly CompletedGoal[];
  readonly pinnedGoalId: string | null;
};

export type GoalRules = {
  readonly goals: readonly GoalDefinition[];
  readonly instruments: readonly MarketInstrument[];
  readonly collection: CollectionEconomy;
};

export const NO_GOAL_PROGRESS: GoalProgress = { completed: [], pinnedGoalId: null };

type ActionCheck = (state: GameState, rules: GoalRules) => boolean;

function holdsMarket(market: MarketInstrument['market']): ActionCheck {
  return (state, rules) =>
    state.positions.some(
      (position) =>
        position.quantity > 0n &&
        rules.instruments.some(
          (instrument) => instrument.id === position.instrumentId && instrument.market === market,
        ),
    );
}

const FIRST_ACTION_CHECKS: Readonly<Record<FirstAction, ActionCheck>> = {
  wallet_upgrade: (state) => state.tap.walletLevel > 0,
  business_purchase: (state) => state.businesses.length > 0,
  rental_started: (state) => state.properties.some((property) => property.rented),
  stock_purchase: holdsMarket('stocks'),
  crypto_purchase: holdsMarket('crypto'),
  dividend_received: (state) => state.income.dividendEarningsCents > 0n,
};

function isReached(goal: GoalDefinition, state: GameState, rules: GoalRules): boolean {
  if (goal.kind === 'peak_net_worth') return state.peakNetWorthCents >= goal.threshold;
  if (goal.kind === 'first_action') return FIRST_ACTION_CHECKS[goal.action](state, rules);
  const { collection: economy } = rules;
  return collectionProgress(state.collectibles, { economy, measure: goal.measure }) >= goal.count;
}

function isGoalCompleted(progress: GoalProgress, goalId: string): boolean {
  return progress.completed.some((goal) => goal.goalId === goalId);
}

export function withCompletedGoals(
  state: GameState,
  rules: GoalRules,
): { state: GameState; completedGoalIds: readonly string[] } {
  const { goals } = state;
  const completedGoalIds = rules.goals
    .filter((goal) => !isGoalCompleted(goals, goal.id) && isReached(goal, state, rules))
    .map((goal) => goal.id);
  if (completedGoalIds.length === 0) return { state, completedGoalIds };
  const reached = completedGoalIds.map((goalId) => ({
    goalId,
    simulationMs: state.clock.simulationMs,
  }));
  const pinnedGoalId =
    goals.pinnedGoalId !== null && completedGoalIds.includes(goals.pinnedGoalId)
      ? null
      : goals.pinnedGoalId;
  return {
    state: { ...state, goals: { completed: [...goals.completed, ...reached], pinnedGoalId } },
    completedGoalIds,
  };
}

export function applyPinGoal(
  state: GameState,
  pin: { goalId: string | null; rules: GoalRules },
): CommandResult {
  const { goalId } = pin;
  const unchanged = { ok: true, cashChangeCents: moneyCents(0) } as const;
  if (goalId === null) {
    return { ...unchanged, state: { ...state, goals: { ...state.goals, pinnedGoalId: null } } };
  }
  if (!pin.rules.goals.some((goal) => goal.id === goalId)) {
    return { ok: false, error: 'UNKNOWN_GOAL' };
  }
  if (isGoalCompleted(state.goals, goalId)) return { ok: false, error: 'GOAL_COMPLETED' };
  return { ...unchanged, state: { ...state, goals: { ...state.goals, pinnedGoalId: goalId } } };
}
