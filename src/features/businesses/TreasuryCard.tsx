import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import { formatMoneyExact, moneyCents } from '@/domain/money';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ChoiceRow } from '@/ui/ChoiceRow';
import { DetailLine } from '@/ui/DetailLine';
import { AppText } from '@/ui/Typography';

import type { TreasuryActions } from './treasuryActions';

const WHOLE_PERCENT = 100;
const DEPOSIT_SHARE = 2n;

function payoutChoices(stepPercent: number) {
  const steps = Math.floor(WHOLE_PERCENT / stepPercent);
  return Array.from({ length: steps + 1 }, (_unused, index) => {
    const percent = String(index * stepPercent);
    return { value: percent, label: `${percent}%` };
  });
}

export function TreasuryCard({
  detail,
  actions,
}: {
  detail: OwnedBusinessDetail;
  actions: TreasuryActions;
}) {
  const depositCents = moneyCents(detail.cashCents / DEPOSIT_SHARE);
  const deposit = `Deposit half your cash · ${formatMoneyExact(depositCents)}`;
  const withdraw = `Withdraw all · ${formatMoneyExact(detail.treasuryCents)}`;
  return (
    <Card>
      <DetailLine label="Treasury" value={formatMoneyExact(detail.treasuryCents)} emphasis />
      {detail.operation === 'closed' ? (
        <AppText muted>Closed: its treasury ran out. A deposit reopens it.</AppText>
      ) : null}
      <ChoiceRow
        title="Payout"
        note="The share of each day's profit that goes to your cash. The rest stays here."
        choices={payoutChoices(detail.payoutStepPercent)}
        selected={String(detail.payoutPercent)}
        onSelect={(percent) => actions.setPayout(Number(percent))}
      />
      <Button
        label={deposit}
        variant="secondary"
        onPress={() => actions.deposit(depositCents)}
        disabled={depositCents <= 0n}
      />
      <Button
        label={withdraw}
        variant="secondary"
        onPress={() => actions.withdrawAll(detail.treasuryCents)}
        disabled={detail.treasuryCents <= 0n}
      />
    </Card>
  );
}
