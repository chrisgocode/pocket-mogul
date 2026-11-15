import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import { formatMoneyExact, formatRatePerMinute } from '@/domain/money';
import { useMoneyFormat } from '@/features/game/useMoneyFormat';
import { StatChips } from '@/ui/StatChips';

export function BusinessStats({ detail }: { detail: OwnedBusinessDetail }) {
  const format = useMoneyFormat();
  return (
    <StatChips
      stats={[
        {
          label: 'Profit / day',
          value: format.short(detail.day.profitCents),
          trend: detail.day.profitCents < 0n ? 'loss' : 'gain',
          accessibilityLabel: `Profit / business day, ${formatMoneyExact(detail.day.profitCents)}`,
        },
        {
          label: 'Treasury',
          value: format.short(detail.treasuryCents),
          accessibilityLabel: `Treasury, ${formatMoneyExact(detail.treasuryCents)}`,
        },
        {
          label: 'To cash',
          value: format.shortRate(detail.cashPerMinuteCents),
          accessibilityLabel: `To your cash, ${formatRatePerMinute(detail.cashPerMinuteCents, 'full')}`,
        },
      ]}
    />
  );
}
