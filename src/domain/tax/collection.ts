import type { GameState } from '@/domain/gameState';
import { moneyCents, type MoneyCents } from '@/domain/money';

import { debtCents } from './assessment';
import { TAX_BPS, type TaxDebt, type TaxLedger, type TaxRules } from './types';

type Paid = {
  readonly remaining: bigint;
  readonly principal: bigint;
  readonly fines: bigint;
  readonly debts: readonly TaxDebt[];
};

function payOne(paid: Paid, debt: TaxDebt): Paid {
  const principal = paid.remaining < debt.principalCents ? paid.remaining : debt.principalCents;
  const available = paid.remaining - principal;
  const fine = available < debt.fineCents ? available : debt.fineCents;
  const updated = {
    ...debt,
    principalCents: moneyCents(debt.principalCents - principal),
    fineCents: moneyCents(debt.fineCents - fine),
  };
  return {
    remaining: available - fine,
    principal: paid.principal + principal,
    fines: paid.fines + fine,
    debts: updated.principalCents + updated.fineCents > 0n ? [...paid.debts, updated] : paid.debts,
  };
}

export function collectTaxDebt(state: GameState, requested: MoneyCents): GameState {
  const { tax } = state;
  if (tax.status !== 'active' || requested <= 0n) return state;
  const available = requested < state.cashCents ? requested : state.cashCents;
  const paid = tax.debts.reduce<Paid>(payOne, {
    remaining: available,
    principal: 0n,
    fines: 0n,
    debts: [],
  });
  return {
    ...state,
    cashCents: moneyCents(state.cashCents - paid.principal - paid.fines),
    tax: {
      ...tax,
      debts: paid.debts,
      paidCents: moneyCents(tax.paidCents + paid.principal),
      finesPaidCents: moneyCents(tax.finesPaidCents + paid.fines),
    },
  };
}

export function recoverTaxDebt(
  state: GameState,
  receipt: { incomingCents: MoneyCents; rules: TaxRules },
): GameState {
  const { tax } = state;
  if (tax.status !== 'active' || debtCents(tax) === 0n || receipt.incomingCents <= 0n) return state;
  const numerator =
    receipt.incomingCents * BigInt(receipt.rules.recoveryBps) + tax.recoveryRemainder;
  const collected = collectTaxDebt(state, moneyCents(numerator / TAX_BPS));
  if (collected.tax.status !== 'active') return collected;
  return { ...collected, tax: { ...collected.tax, recoveryRemainder: numerator % TAX_BPS } };
}

export function taxRestricted(tax: GameState['tax']): boolean {
  return (
    tax.status === 'active' &&
    (debtCents(tax) > 0n || tax.returns.some((r) => r.filing.status === 'unfiled'))
  );
}

export function withTaxDebt(tax: TaxLedger, debt: TaxDebt): TaxLedger {
  return { ...tax, debts: [...tax.debts, debt] };
}
