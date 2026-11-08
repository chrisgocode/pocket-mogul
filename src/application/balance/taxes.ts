import type { Content } from '@/content';
import type { GameCommand } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';
import { moneyCents } from '@/domain/money';
import { debtCents } from '@/domain/tax/assessment';
import { TAX_SHARES } from '@/domain/tax/types';
import { exemptTaxes } from '@/domain/tax/exemption';

export type TaxPolicy = 'honest' | 'evade' | 'exempt';

type TaxPlay = {
  readonly state: () => GameState;
  readonly commit: (command: GameCommand) => boolean;
  readonly policy: TaxPolicy;
};

export function taxStartingState(
  state: GameState,
  context: { policy: TaxPolicy; content: Content },
): GameState {
  const rules = context.content.economy.taxes;
  if (context.policy !== 'exempt' || rules === undefined) return state;
  return exemptTaxes(state, {
    transactionId: 'balance:exempt',
    rules,
    dayMs: context.content.economy.businessRules.dayMs,
  });
}

function debtWithdrawal(
  state: GameState,
  business: GameState['businesses'][number],
): GameCommand | undefined {
  if (state.tax.status !== 'active') return undefined;
  const shortfall = debtCents(state.tax) - state.cashCents;
  const shares = business.listing.status === 'listed' ? business.listing.sharesHeld : TAX_SHARES;
  if (shortfall <= 0n || shares === 0n) return undefined;
  const gross = (shortfall * TAX_SHARES + shares - 1n) / shares;
  const amountCents = moneyCents(gross < business.treasuryCents ? gross : business.treasuryCents);
  return amountCents > 0n
    ? { type: 'WithdrawFromTreasury', businessId: business.definitionId, amountCents }
    : undefined;
}

function fundDebt(play: TaxPlay) {
  for (const business of play.state().businesses) {
    const withdrawal = debtWithdrawal(play.state(), business);
    if (withdrawal !== undefined) play.commit(withdrawal);
  }
}

export function playTaxes(play: TaxPlay): void {
  const { tax } = play.state();
  if (tax.status !== 'active') return;
  const returns = tax.returns.filter((r) => r.filing.status === 'unfiled');
  for (const statement of returns) {
    play.commit({
      type: 'FileTaxReturn',
      returnId: statement.id,
      method: play.policy === 'evade' ? 'zero' : 'honest',
      revision: play.state().revision,
    });
  }
  fundDebt(play);
  const current = play.state();
  if (current.tax.status !== 'active' || debtCents(current.tax) === 0n || current.cashCents <= 0n)
    return;
  play.commit({ type: 'PayTaxDebt', amountCents: current.cashCents });
}
