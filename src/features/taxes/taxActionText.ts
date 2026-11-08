import type { TaxesView } from '@/application/taxesView';
import { payableTax } from '@/application/taxesView';
import type { GameCommand } from '@/domain/commands';
import { formatMoneyExact, moneyCents } from '@/domain/money';
import type { ActionSheetText } from '@/features/game/ActionSheet';

export function taxActionText(command: GameCommand, view: TaxesView): ActionSheetText {
  if (command.type === 'PayTaxDebt')
    return {
      title: 'Pay assessed tax debt',
      confirmLabel: 'Pay debt',
      lines: [{ label: 'Payment', value: formatMoneyExact(command.amountCents) }],
    };
  const statement =
    command.type === 'FileTaxReturn'
      ? view.returns.find((r) => r.id === command.returnId)
      : undefined;
  const tax = statement?.amountCents ?? moneyCents(0);
  if (command.type === 'FileTaxReturn' && command.method === 'zero')
    return {
      title: 'Report no taxable income',
      confirmLabel: 'File zero return',
      lines: [
        { label: 'Pay now', value: '$0.00' },
        { label: 'One audit check', value: `${view.auditPercent} after 10 credited minutes` },
        { label: 'Back tax if audited', value: formatMoneyExact(tax) },
        {
          label: 'Additional fine',
          value: formatMoneyExact(moneyCents(tax * BigInt(view.fineMultiplier))),
        },
        {
          label: 'Collection if audited',
          value: `Available personal cash, then a ${view.recoveryPercent} installment plan`,
        },
      ],
    };
  return honestText(view, tax);
}

function honestText(view: TaxesView, tax: ReturnType<typeof moneyCents>): ActionSheetText {
  const debt = moneyCents(tax + view.debtCents);
  const payment = payableTax(view.cashCents, debt);
  return {
    title: 'Report all taxable income',
    confirmLabel: 'File and pay available cash',
    lines: [
      { label: 'New tax', value: formatMoneyExact(tax) },
      { label: 'Personal cash collected', value: formatMoneyExact(payment) },
      { label: 'Debt remaining', value: formatMoneyExact(moneyCents(debt - payment)) },
      {
        label: 'Installments if needed',
        value: `${view.recoveryPercent} of eligible receipts; no honesty fine`,
      },
    ],
  };
}
