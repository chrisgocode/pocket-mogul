import { payableTax, type TaxesView } from '@/application/taxesView';
import type { GameCommand } from '@/domain/commands';
import { formatMoneyExact } from '@/domain/money';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { DetailLine } from '@/ui/DetailLine';
import { Disclosure } from '@/ui/Disclosure';
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
      {view.debtCents > 0n ? (
        <>
          <DetailLine
            label="Outstanding assessed debt"
            value={formatMoneyExact(view.debtCents)}
            emphasis
          />
          <AppText
            variant="caption"
            muted
          >{`${view.recoveryPercent} of eligible credits · taps exempt`}</AppText>
          <Button
            label={`Pay debt · ${formatMoneyExact(amount)}`}
            disabled={amount <= 0n}
            onPress={() => review({ type: 'PayTaxDebt', amountCents: amount })}
          />
        </>
      ) : null}
      <Disclosure title="Payment history">
        <DetailLine
          label="Total estimated and assessed liability"
          value={formatMoneyExact(view.liabilityCents)}
        />
        <DetailLine label="Lifetime tax paid" value={formatMoneyExact(view.paidCents)} />
        <DetailLine label="Lifetime fines paid" value={formatMoneyExact(view.finesPaidCents)} />
        <DetailLine label="Successful evasion" value={formatMoneyExact(view.evadedCents)} />
      </Disclosure>
    </Card>
  );
}
