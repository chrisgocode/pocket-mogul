import type { GameState } from './gameState';
import { moneyCents, type MoneyCents } from './money';

function netWorthCents(state: GameState): MoneyCents {
  return moneyCents(
    state.businesses.reduce<bigint>(
      (total, business) => total + business.capitalizedSpendCents,
      state.cashCents,
    ),
  );
}

export function withPeakNetWorth(state: GameState): GameState {
  const netWorth = netWorthCents(state);
  return netWorth > state.peakNetWorthCents ? { ...state, peakNetWorthCents: netWorth } : state;
}
