import { TaxIncomeNote } from '@/features/taxes/TaxIncomeNote';
import type { MoneyCents } from '@/domain/money';
import { useMoneyFormat } from '@/features/game/useMoneyFormat';
import { Card } from '@/ui/Card';
import { AppText } from '@/ui/Typography';

export function HomeCashCard({
  cashCents,
  perTapCents,
  passivePerMinuteCents,
}: {
  cashCents: MoneyCents;
  perTapCents: MoneyCents;
  passivePerMinuteCents: MoneyCents;
}) {
  const format = useMoneyFormat();
  const cash = format.money(cashCents);
  return (
    <Card>
      <AppText variant="caption" muted>
        Cash
      </AppText>
      <AppText variant="display" accessibilityLabel={`Cash ${cash}`}>
        {cash}
      </AppText>
      <AppText muted>
        {format.money(perTapCents)} per tap · {format.rate(passivePerMinuteCents)} passive cash
      </AppText>
      <TaxIncomeNote />
    </Card>
  );
}
