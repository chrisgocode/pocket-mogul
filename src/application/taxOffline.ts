import type { GameState } from '@/domain/gameState';
import { moneyCents } from '@/domain/money';
import { currentTaxLines } from '@/domain/tax/assessment';
import type { TaxAbsence } from '@/domain/tax/types';

function totals(state: GameState) {
  const { tax } = state;
  if (tax.status === 'notStarted') return { gross: 0n, costs: 0n, estimated: 0n, paid: 0n };
  const lines = currentTaxLines(tax);
  return {
    gross: tax.grossCents + lines.reduce((sum, line) => sum + line.grossCents, 0n),
    costs: tax.costsCents + lines.reduce((sum, line) => sum + line.costsCents, 0n),
    estimated: tax.assessedCents + lines.reduce((sum, line) => sum + line.taxCents, 0n),
    paid: tax.paidCents + tax.finesPaidCents,
  };
}

function merged(a: TaxAbsence, b: TaxAbsence): TaxAbsence {
  return {
    grossCents: moneyCents(a.grossCents + b.grossCents),
    costsCents: moneyCents(a.costsCents + b.costsCents),
    estimatedCents: moneyCents(a.estimatedCents + b.estimatedCents),
    collectedCents: moneyCents(a.collectedCents + b.collectedCents),
    cashCents: moneyCents(a.cashCents + b.cashCents),
    treasuryCents: moneyCents(a.treasuryCents + b.treasuryCents),
  };
}

export function withTaxAbsence(before: GameState, after: GameState): GameState {
  if (after.tax.status === 'notStarted' || after.returnSummary.status !== 'pending') return after;
  const old = totals(before);
  const next = totals(after);
  const summary = {
    grossCents: moneyCents(next.gross - old.gross),
    costsCents: moneyCents(next.costs - old.costs),
    estimatedCents: moneyCents(next.estimated - old.estimated),
    collectedCents: moneyCents(next.paid - old.paid),
    cashCents: moneyCents(after.cashCents - before.cashCents),
    treasuryCents: moneyCents(treasury(after) - treasury(before)),
  };
  const previous =
    before.tax.status === 'notStarted' ? { status: 'none' as const } : before.tax.absence;
  const combined =
    before.returnSummary.status === 'pending' && previous.status === 'pending'
      ? merged(previous.summary, summary)
      : summary;
  return { ...after, tax: { ...after.tax, absence: { status: 'pending', summary: combined } } };
}

function treasury(state: GameState): bigint {
  return state.businesses.reduce((sum, b) => sum + b.treasuryCents, 0n);
}
