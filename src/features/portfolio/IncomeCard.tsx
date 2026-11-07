import type { IncomeRate, IncomeSource } from '@/application/portfolioView';
import { formatMoneyExact, formatRatePerMinute } from '@/domain/money';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';

function rateText(rate: IncomeRate | undefined): string | undefined {
  if (rate === undefined) return undefined;
  return rate.per === 'minute'
    ? `${formatRatePerMinute(rate.cents, 'full')} net`
    : `about ${formatMoneyExact(rate.cents)} per market hour`;
}

export function IncomeCard({ income }: { income: readonly IncomeSource[] }) {
  return (
    <Card>
      {income.map((line) => (
        <ListRow
          key={line.source}
          title={line.source}
          subtitle={rateText(line.rate)}
          value={formatMoneyExact(line.lifetimeCents)}
          detail="earned"
        />
      ))}
    </Card>
  );
}
