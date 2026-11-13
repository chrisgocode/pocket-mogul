import type { Content, Goal } from '@/content';
import type { GameState } from '@/domain/gameState';
import { moneyCents, type MoneyCents } from '@/domain/money';

import { gameClockText } from './clockText';
import { goalProgressText } from './goalProgressText';

type Named = {
  readonly id: string;
  readonly title: string;
  readonly rewardCents: MoneyCents;
};

export type GoalView =
  | (Named & { readonly status: 'claimable' | 'claimed'; readonly reachedLabel: string })
  | (Named & {
      readonly status: 'open';
      readonly progressLabel: string;
      readonly pinned: boolean;
    });

export type GoalsView = {
  readonly goals: readonly GoalView[];
  readonly reachedCount: number;
  readonly claimableIds: readonly string[];
  readonly claimableCents: MoneyCents;
};

function reachedStatus(goal: Goal, state: GameState): 'claimable' | 'claimed' {
  return goal.reward === 0n || state.claimedGoals.includes(goal.id) ? 'claimed' : 'claimable';
}

function goalView(goal: Goal, state: GameState, content: Content): GoalView {
  const named = { id: goal.id, title: goal.title, rewardCents: goal.reward };
  const reached = state.goals.completed.find((completed) => completed.goalId === goal.id);
  if (reached !== undefined) {
    return {
      ...named,
      status: reachedStatus(goal, state),
      reachedLabel: `Reached ${gameClockText(reached.simulationMs)}`,
    };
  }
  return {
    ...named,
    status: 'open',
    progressLabel: goalProgressText(goal, { state, content }),
    pinned: state.goals.pinnedGoalId === goal.id,
  };
}

export function selectGoals(state: GameState, content: Content): GoalsView {
  const goals = content.goals.map((goal) => goalView(goal, state, content));
  const claimable = goals.filter((goal) => goal.status === 'claimable');
  return {
    goals,
    reachedCount: goals.filter((goal) => goal.status !== 'open').length,
    claimableIds: claimable.map((goal) => goal.id),
    claimableCents: moneyCents(claimable.reduce((total, goal) => total + goal.rewardCents, 0n)),
  };
}

export function selectPinnedGoal(
  state: GameState,
  content: Content,
): Extract<GoalView, { status: 'open' }> | undefined {
  const goal = content.goals.find((listed) => listed.id === state.goals.pinnedGoalId);
  if (goal === undefined) return undefined;
  const view = goalView(goal, state, content);
  return view.status === 'open' ? view : undefined;
}

export function goalTitles(content: Content, goalIds: readonly string[]): readonly string[] {
  return goalIds.flatMap((goalId) => {
    const goal = content.goals.find((listed) => listed.id === goalId);
    return goal === undefined ? [] : [goal.title];
  });
}
