import type { Content } from '@/content';
import { quoteTaxCommand } from '@/application/taxQuotes';
import type { GameCommand } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';
import { formatMoneyExact } from '@/domain/money';
import type { ActionSheetText } from '@/features/game/ActionSheet';
import { formatCashChange } from '@/features/game/priceFormat';

export function taxActionDetails(
  text: ActionSheetText,
  context: { state: GameState; content: Content; command: GameCommand },
): ActionSheetText {
  const { command } = context;
  const sale = command.type === 'SellBusiness' || command.type === 'SellProperty';
  if (!sale && command.type !== 'WithdrawFromTreasury') return text;
  const quote = quoteTaxCommand(context.state, context);
  if (quote === undefined) return text;
  const lines = text.lines
    .filter((line) => line.label !== 'Treasury paid out')
    .map((line) =>
      line.label === 'Cash change'
        ? Object.assign({}, line, { value: formatCashChange(quote.cashChangeCents) })
        : line,
    );
  return {
    ...text,
    confirmLabel: `${sale ? 'Confirm sale' : 'Confirm withdrawal'} · ${formatCashChange(quote.cashChangeCents)}`,
    lines: [
      ...lines,
      {
        label: 'Firm quote',
        value: 'Amounts refresh when your company changes. Expired quotes need review.',
      },
      { label: 'Tax basis consumed', value: formatMoneyExact(quote.basisCents) },
      { label: 'Realized taxable gain/loss', value: formatMoneyExact(quote.gainCents) },
      {
        label: 'Estimated tax change, paid at filing',
        value: formatMoneyExact(quote.taxChangeCents),
      },
    ],
  };
}
