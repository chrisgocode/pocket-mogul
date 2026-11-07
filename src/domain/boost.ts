import type { CommandResult } from './commands';
import type { GameState } from './gameState';
import { moneyCents } from './money';

export type BoostRules = {
  readonly tapMultiplier: number;
  readonly durationMs: number;
};

export type Boost =
  | { readonly status: 'none' }
  | { readonly status: 'pending'; readonly grantId: string }
  | { readonly status: 'active'; readonly grantId: string; readonly remainingMs: number };

export type RewardState = {
  readonly boost: Boost;
  readonly processedRewardIds: readonly string[];
};

export const NO_REWARDS: RewardState = { boost: { status: 'none' }, processedRewardIds: [] };

const unchanged = (state: GameState): CommandResult => ({
  ok: true,
  state,
  cashChangeCents: moneyCents(0),
});

const withBoost = (state: GameState, boost: Boost): GameState => ({
  ...state,
  reward: { ...state.reward, boost },
});

export type RewardChange = 'granted' | 'activated';

export function rewardChange(before: Boost, after: Boost): RewardChange | undefined {
  if (before.status === 'none' && after.status === 'pending') return 'granted';
  if (before.status === 'pending' && after.status === 'active') return 'activated';
  return undefined;
}

export function boostRemainingMs(boost: Boost): number {
  return boost.status === 'active' ? boost.remainingMs : 0;
}

export function isBoostActive(state: GameState): boolean {
  return state.reward.boost.status === 'active';
}

export function consumeBoostTime(state: GameState, elapsedMs: number): GameState {
  const { boost } = state.reward;
  if (boost.status !== 'active' || elapsedMs <= 0) return state;
  const remainingMs = boost.remainingMs - elapsedMs;
  return withBoost(state, remainingMs > 0 ? { ...boost, remainingMs } : { status: 'none' });
}

export function applyRecordAdReward(
  state: GameState,
  reward: { presentationId: string },
): CommandResult {
  const { processedRewardIds, boost } = state.reward;
  if (processedRewardIds.includes(reward.presentationId)) return unchanged(state);
  if (boost.status !== 'none') return { ok: false, error: 'BOOST_ACTIVE' };
  return unchanged({
    ...state,
    reward: {
      boost: { status: 'pending', grantId: reward.presentationId },
      processedRewardIds: [...processedRewardIds, reward.presentationId],
    },
  });
}

export function applyActivateBoost(state: GameState, rules: BoostRules): CommandResult {
  const { boost } = state.reward;
  if (boost.status !== 'pending') return unchanged(state);
  return unchanged(
    withBoost(state, { status: 'active', grantId: boost.grantId, remainingMs: rules.durationMs }),
  );
}
