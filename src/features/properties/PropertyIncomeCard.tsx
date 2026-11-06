import type { OwnedPropertyDetail } from '@/application/propertyDetailView';
import { formatMoneyExact, formatRatePerMinute, moneyCents } from '@/domain/money';
import { Card } from '@/ui/Card';
import { DetailLine } from '@/ui/DetailLine';

export function PropertyIncomeCard({ detail }: { detail: OwnedPropertyDetail }) {
  const { income } = detail;
  return (
    <Card>
      <DetailLine label="Status" value={detail.rented ? 'Rented' : 'Vacant'} />
      <DetailLine label="Rent" value={formatRatePerMinute(income.rentCents, 'full')} />
      <DetailLine
        label="Upkeep"
        value={formatRatePerMinute(moneyCents(0n - income.upkeepCents), 'full')}
      />
      <DetailLine
        label="Net rent"
        value={formatRatePerMinute(income.netPerMinuteCents, 'full')}
        emphasis
      />
      <DetailLine label="Estimated value" value={formatMoneyExact(detail.valueCents)} />
    </Card>
  );
}
