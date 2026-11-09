import { payableTax, type TaxesView } from '@/application/taxesView';
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
  const exposure = moneyCents(statement.amountCents * BigInt(view.fineMultiplier + 1));
  return (
    <>
      <Button
        label={`Pay & file · ${formatMoneyExact(payableTax(view.cashCents, statement.amountCents))} now`}
        onPress={() => file('honest')}
      />
      <Button label="Don’t report · $0 now" variant="secondary" onPress={() => file('zero')} />
      <AppText
        variant="caption"
        muted
      >{`${view.auditPercent} audit risk · ${formatMoneyExact(exposure)} if audited`}</AppText>
    </>
  );
}
