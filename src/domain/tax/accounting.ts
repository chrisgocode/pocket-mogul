import { requireTaxBasis } from './basis';
import { businessTaxSource, rentalTaxSource } from '@/domain/tax/sources';
import type { PassiveEconomy } from '@/domain/passiveIncome';
import type { BusinessAccounting } from '@/domain/business/treasury';
import type { GameState } from '@/domain/gameState';
import { pendingDividendsCents } from '@/domain/dividends';
import { moneyCents } from '@/domain/money';
import { quotePropertyIncome } from '@/domain/propertyQuotes';
import { recordTaxReceipt, recordWholeTaxReceipt } from '@/domain/tax/ledger';
import { TAX_SHARES } from '@/domain/tax/types';

const MINUTE_MS = 60_000n;

export function recordBusinessAccounting(
  state: GameState,
  step: { entries: readonly BusinessAccounting[]; dayMs: number },
): GameState {
  const tax = step.entries.reduce((ledger, entry) => {
    if (ledger.status !== 'active' || (entry.elapsedMs === 0 && entry.profitCents === 0n))
      return ledger;
    const source = businessTaxSource(entry.businessId);
    const denominator = TAX_SHARES * BigInt(step.dayMs);
    const next = recordTaxReceipt(ledger, {
      source,
      denominator,
      grossNumerator: entry.grossPerDayCents * BigInt(entry.elapsedMs) * entry.shares,
      profitNumerator: entry.profitCents * BigInt(step.dayMs) * entry.shares,
    });
    const profit =
      (next.pools[source]?.profitCents ?? 0n) - (ledger.pools[source]?.profitCents ?? 0n);
    return {
      ...next,
      basis: {
        ...next.basis,
        [source]: moneyCents(requireTaxBasis(next, source) + profit - entry.payoutCents),
      },
    };
  }, state.tax);
  return { ...state, tax };
}

export function recordRentAccounting(
  state: GameState,
  step: { before: GameState; elapsedMs: number; economy: PassiveEconomy },
): GameState {
  const tax = step.before.properties.reduce((ledger, property) => {
    const definition = step.economy.properties.catalog.find((p) => p.id === property.definitionId);
    if (ledger.status !== 'active' || !property.rented || definition === undefined) return ledger;
    const quote = quotePropertyIncome(property, {
      definition,
      rules: step.economy.properties.rules,
    });
    const numerator =
      quote.netPerMinuteCents * BigInt(step.elapsedMs) +
      BigInt(step.before.income.rentRemainders[property.definitionId] ?? 0);
    return recordTaxReceipt(ledger, {
      source: rentalTaxSource(property.definitionId),
      denominator: MINUTE_MS,
      grossNumerator: quote.rentCents * BigInt(step.elapsedMs),
      profitNumerator: (numerator / MINUTE_MS) * MINUTE_MS,
    });
  }, state.tax);
  return { ...state, tax };
}

export function recordDividendAccounting(state: GameState, before: GameState): GameState {
  if (state.tax.status !== 'active') return state;
  const earned =
    state.income.dividendEarningsCents -
    before.income.dividendEarningsCents +
    pendingDividendsCents(state.dividendAccruals) -
    pendingDividendsCents(before.dividendAccruals);
  if (earned === 0n) return state;
  return {
    ...state,
    tax: recordWholeTaxReceipt(state.tax, {
      source: 'dividends',
      grossCents: earned,
      profitCents: earned,
    }),
  };
}
