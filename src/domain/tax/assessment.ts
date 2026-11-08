import { moneyCents, type MoneyCents } from '@/domain/money';

import { TAX_BPS, type TaxLedger, type TaxLine, type TaxPool, type TaxRules } from './types';

export function taxRateBps(wealth: MoneyCents, rules: TaxRules): number {
  if (wealth <= 0n) return 0;
  const slices = rules.bands.reduce(
    (sum, band) => {
      const end = wealth < band.upToCents ? wealth : band.upToCents;
      const width = end > sum.from ? end - sum.from : 0n;
      return { weighted: sum.weighted + width * BigInt(band.rateBps), from: band.upToCents };
    },
    { from: 0n, weighted: 0n },
  );
  const excess = wealth > slices.from ? wealth - slices.from : 0n;
  return Number((slices.weighted + excess * BigInt(rules.topRateBps)) / wealth);
}

export function emptyTaxPool(): TaxPool {
  return {
    grossCents: moneyCents(0),
    profitCents: moneyCents(0),
    lossCents: moneyCents(0),
    taxRemainder: 0n,
    ownerRemainder: 0n,
    grossRemainder: 0n,
  };
}

export function assessPool(
  pool: TaxPool,
  day: { source: string; atMs: number; rateBps: number },
): TaxLine {
  const profit = pool.profitCents;
  const positiveProfit = profit > 0n ? profit : 0n;
  const offset = positiveProfit < pool.lossCents ? positiveProfit : pool.lossCents;
  const base = profit > offset ? profit - offset : 0n;
  return {
    ...day,
    grossCents: pool.grossCents,
    costsCents: moneyCents(pool.grossCents - profit),
    profitCents: profit,
    lossOffsetCents: moneyCents(offset),
    baseCents: moneyCents(base),
    taxCents: moneyCents((base * BigInt(day.rateBps) + pool.taxRemainder) / TAX_BPS),
  };
}

export function currentTaxLines(tax: TaxLedger): readonly TaxLine[] {
  return Object.entries(tax.pools).map(([source, pool]) =>
    assessPool(pool, { source, atMs: tax.dayEndsMs, rateBps: tax.rateBps }),
  );
}

export function debtCents(tax: TaxLedger): MoneyCents {
  return moneyCents(
    tax.debts.reduce((sum, debt) => sum + debt.principalCents + debt.fineCents, 0n),
  );
}

export function taxLiabilityCents(tax: TaxLedger | { readonly status: 'notStarted' }): MoneyCents {
  if (tax.status !== 'active') return moneyCents(0);
  const unfiled = tax.returns.filter((r) => r.filing.status === 'unfiled');
  return moneyCents(
    debtCents(tax) +
      unfiled.reduce((sum, r) => sum + r.amountCents, 0n) +
      [...tax.lines, ...currentTaxLines(tax)].reduce((sum, line) => sum + line.taxCents, 0n),
  );
}
