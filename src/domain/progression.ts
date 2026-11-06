import type { GameState } from './gameState';
import { moneyCents, type MoneyCents } from './money';

export type TierThresholds = Readonly<Record<number, MoneyCents>>;

type AssetValuation = (state: GameState) => bigint;

const cash: AssetValuation = (state) => state.cashCents;

const businessCarryingValue: AssetValuation = (state) =>
  state.businesses.reduce<bigint>((total, business) => total + business.capitalizedSpendCents, 0n);

const ASSET_VALUATIONS: readonly AssetValuation[] = [cash, businessCarryingValue];

function netWorthCents(state: GameState): MoneyCents {
  return moneyCents(ASSET_VALUATIONS.reduce<bigint>((total, value) => total + value(state), 0n));
}

function withPeakNetWorth(state: GameState): GameState {
  const netWorth = netWorthCents(state);
  return netWorth > state.peakNetWorthCents ? { ...state, peakNetWorthCents: netWorth } : state;
}

function withUnlockedTiers(state: GameState, thresholds: TierThresholds): GameState {
  const reached = Object.entries(thresholds)
    .filter(([, threshold]) => threshold <= state.peakNetWorthCents)
    .map(([tier]) => Number(tier))
    .filter((tier) => !state.unlockedTiers.includes(tier));
  if (reached.length === 0) return state;
  return {
    ...state,
    unlockedTiers: [...state.unlockedTiers, ...reached].toSorted((a, b) => a - b),
  };
}

export function withProgress(state: GameState, thresholds: TierThresholds): GameState {
  return withUnlockedTiers(withPeakNetWorth(state), thresholds);
}
