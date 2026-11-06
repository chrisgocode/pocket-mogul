import { formatMoneyExact, formatRatePerMinute, type MoneyCents } from '@/domain/money';
import { Card } from '@/ui/Card';
import { AppText } from '@/ui/Typography';

export function RentIncomeCard({
  cashCents,
  rentPerMinuteCents,
}: {
  cashCents: MoneyCents;
  rentPerMinuteCents: MoneyCents;
}) {
  const cash = formatMoneyExact(cashCents);
  return (
    <Card>
      <AppText variant="caption" muted>
        Cash
      </AppText>
      <AppText variant="number" accessibilityLabel={`Cash ${cash}`}>
        {cash}
      </AppText>
      <AppText muted>Rent income {formatRatePerMinute(rentPerMinuteCents, 'full')} net</AppText>
    </Card>
  );
}
