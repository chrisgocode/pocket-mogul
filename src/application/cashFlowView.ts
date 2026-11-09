import type { Content } from '@/content';
import { moneyCents } from '@/domain/money';
import { passiveIncomePerMinuteCents } from '@/domain/passiveIncome';
import { recoverTaxDebt } from '@/domain/tax/collection';
import { stateWithUnsavedIncome } from './cashView';
import { passiveEconomy } from './economy';
import type { GameSnapshot } from './game';
export function selectCashFlow(snapshot: GameSnapshot, content: Content) {
  const state = stateWithUnsavedIncome(snapshot, content);
  const grossCents = passiveIncomePerMinuteCents(state, passiveEconomy(content));
  const rules = content.economy.taxes;
  const incoming = { ...state, cashCents: moneyCents(state.cashCents + grossCents) };
  const collected =
    rules === undefined ? incoming : recoverTaxDebt(incoming, { incomingCents: grossCents, rules });
  return {
    grossCents,
    recoveryCents: moneyCents(incoming.cashCents - collected.cashCents),
    netCents: moneyCents(collected.cashCents - state.cashCents),
  };
}
