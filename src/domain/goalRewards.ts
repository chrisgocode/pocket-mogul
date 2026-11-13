import type { CommandResult } from './commands';
import type { GameState } from './gameState';
import type { GoalRules } from './goals';
import { moneyCents, type MoneyCents } from './money';

export type ClaimGoals = { readonly type: 'ClaimGoals'; readonly goalIds: readonly string[] };

export function claimableGoalIds(state: GameState, rules: GoalRules): string[] {
  return rules.goals
    .filter(
      (goal) =>
        goal.reward > 0n &&
        state.goals.completed.some((completed) => completed.goalId === goal.id) &&
        !state.claimedGoals.includes(goal.id),
    )
    .map((goal) => goal.id);
}

export function goalRewardCents(goalIds: readonly string[], rules: GoalRules): MoneyCents {
  return moneyCents(
    rules.goals
      .filter((goal) => goalIds.includes(goal.id))
      .reduce((total, goal) => total + goal.reward, 0n),
  );
}

export function applyClaimGoals(
  state: GameState,
  claim: { readonly goalIds: readonly string[]; readonly rules: GoalRules },
): CommandResult {
  const { goalIds, rules } = claim;
  if (goalIds.some((goalId) => !rules.goals.some((goal) => goal.id === goalId)))
    return { ok: false, error: 'UNKNOWN_GOAL' };
  const claimable = claimableGoalIds(state, rules);
  const unique = new Set(goalIds);
  if (unique.size !== goalIds.length || goalIds.some((goalId) => !claimable.includes(goalId)))
    return { ok: false, error: 'GOAL_NOT_CLAIMABLE' };
  const cashChangeCents = goalRewardCents(goalIds, rules);
  return {
    ok: true,
    cashChangeCents,
    state: {
      ...state,
      cashCents: moneyCents(state.cashCents + cashChangeCents),
      claimedGoals: [...state.claimedGoals, ...goalIds],
    },
  };
}
