import type { CommandResult } from './commands';
import type { GameState } from './gameState';
import { divideRoundingUp, moneyCents, type MoneyCents } from './money';
import { tapPayoutCents, type TapRules } from './tapping';

export type WalletRules = TapRules & {
  readonly maxLevel: number;
  readonly upgradeBaseCents: MoneyCents;
  readonly upgradeGrowth: { readonly numerator: number; readonly denominator: number };
  readonly artworkLevels: readonly number[];
};

export type WalletQuote =
  | { readonly status: 'max'; readonly level: number; readonly payoutCents: MoneyCents }
  | {
      readonly status: 'available';
      readonly level: number;
      readonly payoutCents: MoneyCents;
      readonly nextPayoutCents: MoneyCents;
      readonly priceCents: MoneyCents;
    };

function upgradePriceCents(level: number, rules: WalletRules): MoneyCents {
  const exponent = BigInt(level);
  const numerator = BigInt(rules.upgradeGrowth.numerator) ** exponent;
  const denominator = BigInt(rules.upgradeGrowth.denominator) ** exponent;
  return moneyCents(divideRoundingUp(rules.upgradeBaseCents * numerator, denominator));
}

export function quoteWalletUpgrade(level: number, rules: WalletRules): WalletQuote {
  const payoutCents = tapPayoutCents(level, rules);
  if (level >= rules.maxLevel) return { status: 'max', level, payoutCents };
  return {
    status: 'available',
    level,
    payoutCents,
    nextPayoutCents: tapPayoutCents(level + 1, rules),
    priceCents: upgradePriceCents(level, rules),
  };
}

export function applyWalletUpgrade(
  state: GameState,
  upgrade: { fromLevel: number; rules: WalletRules },
): CommandResult {
  const quote = quoteWalletUpgrade(state.tap.walletLevel, upgrade.rules);
  if (upgrade.fromLevel !== quote.level) return { ok: false, error: 'STALE_QUOTE' };
  if (quote.status === 'max') return { ok: false, error: 'MAX_LEVEL' };
  if (state.cashCents < quote.priceCents) return { ok: false, error: 'INSUFFICIENT_CASH' };
  return {
    ok: true,
    cashChangeCents: moneyCents(0n - quote.priceCents),
    state: {
      ...state,
      cashCents: moneyCents(state.cashCents - quote.priceCents),
      tap: { ...state.tap, walletLevel: quote.level + 1 },
    },
  };
}

export function walletArtworkStage(level: number, artworkLevels: readonly number[]): number {
  return Math.max(0, artworkLevels.filter((threshold) => threshold <= level).length - 1);
}
