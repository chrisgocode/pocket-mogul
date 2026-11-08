import type { TaxesView } from '@/application/taxesView';
import type { GameCommand } from '@/domain/commands';
import { formatMoneyExact, moneyCents } from '@/domain/money';
import type { TaxReturn } from '@/domain/tax/types';
import { Button } from '@/ui/Button';
import { AppText } from '@/ui/Typography';

export function TaxFilingButtons({
  statement,
  view,
  review,
}: {
  statement: TaxReturn;
  view: TaxesView;
  review: (command: GameCommand) => void;
}) {
  if (view.oldest?.id !== statement.id) return null;
  const file = (method: 'honest' | 'zero') =>
    review({ type: 'FileTaxReturn', returnId: statement.id, method, revision: view.revision });
  const fine = moneyCents(statement.amountCents * BigInt(view.fineMultiplier));
  return (
    <>
      <Button
        label={`Report everything · ${formatMoneyExact(statement.amountCents)}`}
        onPress={() => file('honest')}
      />
      <Button
        label={`Report nothing · $0 · ${view.auditPercent} audit risk`}
        variant="secondary"
        onPress={() => file('zero')}
      />
      <AppText
        muted
      >{`If audited: ${formatMoneyExact(statement.amountCents)} back tax + ${formatMoneyExact(fine)} fine. Check after 10 credited minutes.`}</AppText>
    </>
  );
}
