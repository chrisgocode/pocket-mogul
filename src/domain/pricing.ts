import type { CommandResult } from './commands';
import type { GameState } from './gameState';
import { divideRoundingUp, moneyCents, type MoneyCents } from './money';

const BASIS_POINTS = 10_000n;

export type UpgradePricing = {
  readonly basePriceCents: MoneyCents;
  readonly weightBps: number;
  readonly growth: { readonly numerator: number; readonly denominator: number };
  readonly level: number;
};

export function geometricUpgradeCents(pricing: UpgradePricing): MoneyCents {
  const exponent = BigInt(pricing.level);
  const numerator =
    pricing.basePriceCents *
    BigInt(pricing.weightBps) *
    BigInt(pricing.growth.numerator) ** exponent;
  const denominator = BASIS_POINTS * BigInt(pricing.growth.denominator) ** exponent;
  return moneyCents(divideRoundingUp(numerator, denominator));
}

export function spend(state: GameState, priceCents: MoneyCents): CommandResult {
  if (state.cashCents < priceCents) return { ok: false, error: 'INSUFFICIENT_CASH' };
  return {
    ok: true,
    cashChangeCents: moneyCents(0n - priceCents),
    state: { ...state, cashCents: moneyCents(state.cashCents - priceCents) },
  };
}
