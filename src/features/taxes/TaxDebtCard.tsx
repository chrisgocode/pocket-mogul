import { payableTax, type TaxesView } from '@/application/taxesView';
import type { GameCommand } from '@/domain/commands';
import { formatMoneyExact } from '@/domain/money';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { DetailLine } from '@/ui/DetailLine';
import { AppText } from '@/ui/Typography';

export function TaxDebtCard({
  view,
  review,
}: {
  view: TaxesView;
  review: (command: GameCommand) => void;
}) {
  const amount = payableTax(view.cashCents, view.debtCents);
  return (
    <Card>
      <DetailLine label="Outstanding assessed debt" value={formatMoneyExact(view.debtCents)} />
      <DetailLine
        label="Total estimated and assessed liability"
        value={formatMoneyExact(view.liabilityCents)}
      />
      <DetailLine label="Lifetime tax paid" value={formatMoneyExact(view.paidCents)} />
      <DetailLine label="Lifetime fines paid" value={formatMoneyExact(view.finesPaidCents)} />
      <DetailLine label="Successful evasion" value={formatMoneyExact(view.evadedCents)} />
      <AppText
        muted
      >{`An installment plan collects ${view.recoveryPercent} of new eligible cash receipts. Taps stay exempt. Existing operations continue; assessed debt or an unfiled positive return blocks discretionary investment. No interest, repeated fines or forced sales.`}</AppText>
      {view.debtCents > 0n ? (
        <Button
          label={`Pay debt · ${formatMoneyExact(amount)}`}
          disabled={amount <= 0n}
          onPress={() => review({ type: 'PayTaxDebt', amountCents: amount })}
        />
      ) : null}
    </Card>
  );
}
