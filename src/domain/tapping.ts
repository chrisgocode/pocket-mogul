import type { GameState } from './gameState';
import { moneyCents, type MoneyCents } from './money';
import { withPeakNetWorth } from './netWorth';

export type TapRules = {
  readonly baseCents: MoneyCents;
  readonly perLevelCents: MoneyCents;
};

export function tapPayoutCents(walletLevel: number, rules: TapRules): MoneyCents {
  return moneyCents(rules.baseCents + rules.perLevelCents * BigInt(walletLevel));
}

export function applyTapBatch(
  state: GameState,
  batch: { taps: number; rules: TapRules },
): { state: GameState; earnedCents: MoneyCents } {
  const earnedCents = moneyCents(
    tapPayoutCents(state.tap.walletLevel, batch.rules) * BigInt(batch.taps),
  );
  const cashCents = moneyCents(state.cashCents + earnedCents);
  return {
    earnedCents,
    state: withPeakNetWorth({
      ...state,
      cashCents,
      lifetimeTapEarningsCents: moneyCents(state.lifetimeTapEarningsCents + earnedCents),
      tap: { ...state.tap, totalAcceptedTaps: state.tap.totalAcceptedTaps + batch.taps },
    }),
  };
}
