import type { Content } from '@/content';
import type { GameState } from '@/domain/gameState';
import { moneyCents, type MoneyCents } from '@/domain/money';
import { currentTaxLines, debtCents, taxLiabilityCents } from '@/domain/tax/assessment';
import { AD_REWARD_TAX_SOURCE } from '@/domain/tax/sources';
import type { TaxLine, TaxReturn } from '@/domain/tax/types';

import { durationText } from './clockText';
import type { GameSnapshot } from './game';

const BPS_PER_PERCENT = 100;
const ZERO = moneyCents(0);

const WHOLE_SOURCES: Readonly<Record<string, string>> = {
  capital: 'Realized capital gains',
  [AD_REWARD_TAX_SOURCE]: 'Ad rewards',
};

function taxSourceName(source: string, content: Content): string {
  const [kind, id] = source.split(':');
  if (kind === 'business') return content.businesses.find((b) => b.id === id)?.name ?? source;
  if (kind === 'rental') return content.properties.find((p) => p.id === id)?.name ?? source;
  return WHOLE_SOURCES[source] ?? 'Stock dividends';
}

const EMPTY_LEDGER_VIEW = {
  lines: [] as readonly TaxLine[],
  returns: [] as readonly TaxReturn[],
  ratePercent: '0%',
  marginalRatePercent: '0%',
  openingWealthCents: ZERO,
  nextBoundary: 'Starts at the next Business day',
  debtCents: ZERO,
  paidCents: ZERO,
  finesPaidCents: ZERO,
  evadedCents: ZERO,
  losses: [] as readonly { source: string; cents: MoneyCents }[],
};

function ledgerView(state: GameState) {
  const { tax } = state;
  if (tax.status === 'notStarted') return EMPTY_LEDGER_VIEW;
  const lines = tax.status === 'active' ? [...tax.lines, ...currentTaxLines(tax)] : [];
  const ratePercent = tax.status === 'active' ? `${tax.rateBps / BPS_PER_PERCENT}%` : '0%';
  return {
    lines,
    returns: tax.returns,
    ratePercent,
    marginalRatePercent: `${ratePercent} after remaining losses`,
    openingWealthCents: tax.openingWealthCents,
    nextBoundary: durationText(Math.max(0, tax.returnEndsMs - state.clock.simulationMs)),
    debtCents: debtCents(tax),
    paidCents: tax.paidCents,
    finesPaidCents: tax.finesPaidCents,
    evadedCents: tax.evadedCents,
    losses: Object.entries(tax.pools)
      .filter(([, p]) => p.lossCents > 0n)
      .map(([source, p]) => ({ source, cents: p.lossCents })),
  };
}

function ruleView(content: Content) {
  const rules = content.economy.taxes;
  return {
    auditPercent: rules === undefined ? '0%' : `${rules.auditChanceBps / BPS_PER_PERCENT}%`,
    fineMultiplier: rules?.fineMultiplier ?? 0,
    recoveryPercent: rules === undefined ? '0%' : `${rules.recoveryBps / BPS_PER_PERCENT}%`,
  };
}

export type TaxesView = ReturnType<typeof selectTaxes>;

export function selectTaxes(snapshot: GameSnapshot, content: Content) {
  const { state } = snapshot;
  const ledger = ledgerView(state);
  return {
    ...ledger,
    ...ruleView(content),
    simulationMs: state.clock.simulationMs,
    status: state.tax.status,
    cashCents: state.cashCents,
    revision: state.revision,
    oldest: ledger.returns.find((r) => r.filing.status === 'unfiled'),
    liabilityCents: taxLiabilityCents(state.tax),
    currentCents: moneyCents(ledger.lines.reduce((sum, line) => sum + line.taxCents, 0n)),
    sourceName: (source: string) => taxSourceName(source, content),
  };
}

export function taxLineTotals(lines: readonly TaxLine[]) {
  return lines.reduce(
    (total, line) => ({
      gross: moneyCents(total.gross + line.grossCents),
      costs: moneyCents(total.costs + line.costsCents),
      base: moneyCents(total.base + line.baseCents),
      tax: moneyCents(total.tax + line.taxCents),
    }),
    { gross: ZERO, costs: ZERO, base: ZERO, tax: ZERO },
  );
}

export function payableTax(cash: MoneyCents, debt: MoneyCents): MoneyCents {
  return cash < debt ? cash : debt;
}

export function orderedTaxReturns(returns: readonly TaxReturn[]): readonly TaxReturn[] {
  const resolved = returns.filter((statement) => !unresolved(statement));
  return [
    ...returns.filter(unresolved),
    ...resolved.map((_item, index) => resolved[resolved.length - index - 1]!),
  ];
}

function unresolved(statement: TaxReturn): boolean {
  return statement.filing.status === 'unfiled' || statement.filing.status === 'pendingAudit';
}
