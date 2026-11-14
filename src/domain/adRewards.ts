import type { CollectionEconomy } from './collection/rules';
import type { GameState, IncomeBySource } from './gameState';
import type { PassiveEconomy } from './passiveIncome';

export const DAILY_AD_REWARDS = [
  'rush_day',
  'end_incident',
  'redraw_lots',
  'clear_takeover_lock',
  'briefcase',
] as const;

export type DailyAdReward = (typeof DAILY_AD_REWARDS)[number];

export type AdOffer =
  | { readonly kind: 'double_offline' }
  | { readonly kind: 'rush_day'; readonly businessId: string }
  | { readonly kind: 'end_incident'; readonly businessId: string }
  | { readonly kind: 'redraw_lots' }
  | {
      readonly kind: 'clear_takeover_lock';
      readonly businessId: string;
      readonly rivalId: string;
    }
  | { readonly kind: 'briefcase' };

export type AdRewardRules = {
  readonly dailyLimits: Readonly<Record<DailyAdReward, number>>;
  readonly rushDays: number;
  readonly rushProfitBps: number;
  readonly briefcaseMinutes: number;
};

export type AdRewardEconomy = {
  readonly rules: AdRewardRules;
  readonly passive: PassiveEconomy;
  readonly collection: CollectionEconomy;
};

export type OfflineDouble =
  | { readonly status: 'none' }
  | { readonly status: 'claimed'; readonly bonus: IncomeBySource };

export type LotRedraws = { readonly period: number; readonly count: number };

export type AdRewards = {
  readonly dayKey: string;
  readonly used: Readonly<Partial<Record<DailyAdReward, number>>>;
  readonly lotRedraws: LotRedraws;
  readonly offlineDouble: OfflineDouble;
};

const NO_OFFLINE_DOUBLE: OfflineDouble = { status: 'none' };

export const NO_AD_REWARDS: AdRewards = {
  dayKey: '',
  used: {},
  lotRedraws: { period: 0, count: 0 },
  offlineDouble: NO_OFFLINE_DOUBLE,
};

export type ClaimAdReward = {
  readonly type: 'ClaimAdReward';
  readonly presentationId: string;
  readonly offer: AdOffer;
};

export function withAdRewardDay(state: GameState, dayKey: string): GameState {
  if (state.adRewards.dayKey === dayKey) return state;
  return { ...state, adRewards: { ...state.adRewards, dayKey, used: {} } };
}

export function adRewardsLeft(
  state: GameState,
  reward: { readonly kind: DailyAdReward; readonly rules: AdRewardRules },
): number {
  const used = state.adRewards.used[reward.kind] ?? 0;
  return Math.max(0, reward.rules.dailyLimits[reward.kind] - used);
}

export function withAdRewardUsed(state: GameState, kind: DailyAdReward): GameState {
  const { adRewards } = state;
  const used = { ...adRewards.used, [kind]: (adRewards.used[kind] ?? 0) + 1 };
  return { ...state, adRewards: { ...adRewards, used } };
}

export function withOfflineDoubleCleared(state: GameState): GameState {
  if (state.adRewards.offlineDouble.status === 'none') return state;
  return { ...state, adRewards: { ...state.adRewards, offlineDouble: NO_OFFLINE_DOUBLE } };
}
