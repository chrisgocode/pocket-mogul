import type { MoneyCents } from '@/domain/money';
import { useMoneyFormat } from '@/features/game/useMoneyFormat';
import { Card } from '@/ui/Card';
import { AppText } from '@/ui/Typography';

export function BusinessCashCard({
  cashCents,
  incomePerMinuteCents,
}: {
  cashCents: MoneyCents;
  incomePerMinuteCents: MoneyCents;
}) {
  const format = useMoneyFormat();
  const cash = format.money(cashCents);
  return (
    <Card>
      <AppText variant="caption" muted>
        Cash
      </AppText>
      <AppText variant="number" accessibilityLabel={`Cash ${cash}`}>
        {cash}
      </AppText>
      <AppText muted>Business income {format.rate(incomePerMinuteCents)} net</AppText>
    </Card>
  );
}
