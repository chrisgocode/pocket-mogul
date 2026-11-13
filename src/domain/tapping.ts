import type { GameState } from './gameState';
import { moneyCents, type MoneyCents } from './money';

export type TapRules = {
  readonly baseCents: MoneyCents;
  readonly perLevelCents: MoneyCents;
};

export function tapPayoutCents(walletLevel: number, rules: TapRules): MoneyCents {
  return moneyCents(rules.baseCents + rules.perLevelCents * BigInt(walletLevel));
}

const PERCENT = 100n;

export function boostedTapCents(
  payoutCents: MoneyCents,
  boost: { readonly multiplier: number; readonly bonusPercent?: number },
): MoneyCents {
  const raised =
    payoutCents * BigInt(boost.multiplier) * (PERCENT + BigInt(boost.bonusPercent ?? 0));
  return moneyCents(raised / PERCENT);
}

export function applyTapBatch(
  state: GameState,
  batch: { taps: number; rules: TapRules; multiplier: number; bonusPercent?: number },
): { state: GameState; earnedCents: MoneyCents } {
  const perTapCents = boostedTapCents(tapPayoutCents(state.tap.walletLevel, batch.rules), batch);
  const earnedCents = moneyCents(perTapCents * BigInt(batch.taps));
  const cashCents = moneyCents(state.cashCents + earnedCents);
  return {
    earnedCents,
    state: {
      ...state,
      cashCents,
      lifetimeTapEarningsCents: moneyCents(state.lifetimeTapEarningsCents + earnedCents),
      tap: { ...state.tap, totalAcceptedTaps: state.tap.totalAcceptedTaps + batch.taps },
    },
  };
}
