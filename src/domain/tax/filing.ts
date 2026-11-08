import type { CommandResult } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';
import { drawInt } from '@/domain/marketRandom';
import { moneyCents } from '@/domain/money';

import { collectTaxDebt, withTaxDebt } from './collection';
import { TAX_BPS, type TaxReturn, type TaxRules } from './types';

export function fileTaxReturn(
  state: GameState,
  order: { returnId: number; method: 'honest' | 'zero'; revision: number; rules: TaxRules },
): CommandResult {
  const { tax } = state;
  if (tax.status !== 'active') return { ok: false, error: 'TAX_RETURN_UNAVAILABLE' };
  const oldest = tax.returns.find((r) => r.filing.status === 'unfiled');
  if (state.revision !== order.revision || oldest?.id !== order.returnId)
    return { ok: false, error: 'STALE_QUOTE' };
  const filing =
    order.method === 'honest'
      ? { status: 'honest' as const }
      : auditFiling(state, { id: oldest.id, amountCents: oldest.amountCents, rules: order.rules });
  const filed = {
    ...tax,
    returns: tax.returns.map((r) => (r.id === oldest.id ? Object.assign({}, r, { filing }) : r)),
  };
  const next =
    order.method === 'honest'
      ? collectTaxDebt(
          {
            ...state,
            tax: withTaxDebt(filed, {
              returnId: oldest.id,
              principalCents: oldest.amountCents,
              fineCents: moneyCents(0),
            }),
          },
          state.cashCents,
        )
      : { ...state, tax: filed };
  return { ok: true, state: next, cashChangeCents: moneyCents(next.cashCents - state.cashCents) };
}

function auditOne(state: GameState, statement: TaxReturn): GameState {
  const { tax } = state;
  if (tax.status !== 'active' || statement.filing.status !== 'pendingAudit') return state;
  const caught = statement.filing.outcome === 'audit';
  const filing = { status: caught ? ('audited' as const) : ('cleared' as const) };
  const updated = {
    ...tax,
    returns: tax.returns.map((r) => (r.id === statement.id ? { ...r, filing } : r)),
    evadedCents: moneyCents(tax.evadedCents + (caught ? 0n : statement.amountCents)),
  };
  if (!caught) return { ...state, tax: updated };
  const debt = {
    returnId: statement.id,
    principalCents: statement.amountCents,
    fineCents: statement.filing.fineCents,
  };
  return collectTaxDebt({ ...state, tax: withTaxDebt(updated, debt) }, state.cashCents);
}

export function resolveTaxAudits(state: GameState): GameState {
  if (state.tax.status !== 'active') return state;
  const due = state.tax.returns.filter(
    (r) => r.filing.status === 'pendingAudit' && r.filing.dueAtMs <= state.clock.simulationMs,
  );
  return due.reduce((next, statement) => auditOne(next, statement), state);
}

function auditFiling(
  state: GameState,
  assessment: { id: number; amountCents: ReturnType<typeof moneyCents>; rules: TaxRules },
) {
  const roll = drawInt(
    { seed: state.market.seed, tick: assessment.id, scope: 'tax', stream: 'audit' },
    [0, Number(TAX_BPS) - 1],
  );
  return {
    status: 'pendingAudit' as const,
    fineCents: moneyCents(assessment.amountCents * BigInt(assessment.rules.fineMultiplier)),
    dueAtMs: state.clock.simulationMs + assessment.rules.auditDelayMs,
    outcome: roll < assessment.rules.auditChanceBps ? ('audit' as const) : ('clear' as const),
  };
}
