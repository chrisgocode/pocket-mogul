import type { Content, Goal } from '@/content';
import type { GameState } from '@/domain/gameState';
import { formatMoneyCompact, type MoneyCents } from '@/domain/money';

import { gameClockText } from './clockText';

export type GoalView =
  | {
      readonly status: 'reached';
      readonly id: string;
      readonly title: string;
      readonly reachedLabel: string;
    }
  | {
      readonly status: 'open';
      readonly id: string;
      readonly title: string;
      readonly progressLabel: string;
      readonly pinned: boolean;
    };

export type GoalsView = {
  readonly goals: readonly GoalView[];
  readonly reachedCount: number;
};

const FIRST_ACTION_HINTS: Readonly<Record<string, string>> = {
  wallet_upgrade: 'Upgrade your wallet on Home',
  business_purchase: 'Buy any business',
  rental_started: 'Rent out a property you own',
  stock_purchase: 'Buy shares of any stock',
  crypto_purchase: 'Buy any coin',
  dividend_received: 'Hold a dividend stock through a market hour',
};

function progressLabel(goal: Goal, peakCents: MoneyCents): string {
  if (goal.kind === 'first_action') return FIRST_ACTION_HINTS[goal.action] ?? goal.title;
  return `Peak net worth ${formatMoneyCompact(peakCents)} of ${formatMoneyCompact(goal.threshold)}`;
}

function goalView(goal: Goal, state: GameState): GoalView {
  const reached = state.goals.completed.find((completed) => completed.goalId === goal.id);
  if (reached !== undefined) {
    return {
      status: 'reached',
      id: goal.id,
      title: goal.title,
      reachedLabel: `Reached ${gameClockText(reached.simulationMs)}`,
    };
  }
  return {
    status: 'open',
    id: goal.id,
    title: goal.title,
    progressLabel: progressLabel(goal, state.peakNetWorthCents),
    pinned: state.goals.pinnedGoalId === goal.id,
  };
}

export function selectGoals(state: GameState, content: Content): GoalsView {
  const goals = content.goals.map((goal) => goalView(goal, state));
  return { goals, reachedCount: goals.filter((goal) => goal.status === 'reached').length };
}

export function selectPinnedGoal(
  state: GameState,
  content: Content,
): Extract<GoalView, { status: 'open' }> | undefined {
  const goal = content.goals.find((listed) => listed.id === state.goals.pinnedGoalId);
  if (goal === undefined) return undefined;
  const view = goalView(goal, state);
  return view.status === 'open' ? view : undefined;
}

export function goalTitles(content: Content, goalIds: readonly string[]): readonly string[] {
  return goalIds.flatMap((goalId) => {
    const goal = content.goals.find((listed) => listed.id === goalId);
    return goal === undefined ? [] : [goal.title];
  });
}
