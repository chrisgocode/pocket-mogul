import type { ActivityRow } from '@/application/activityView';
import { formatCashChange } from '@/features/game/priceFormat';
import { ListRow } from '@/ui/ListRow';
import { useMoneyFormat } from '@/features/game/useMoneyFormat';

export function ActivityRowView({ row }: { row: ActivityRow }) {
  const format = useMoneyFormat();
  const change = row.cashChangeCents;
  const spoken = [
    row.title,
    row.detail,
    change === undefined ? undefined : formatCashChange(change),
  ];
  return (
    <ListRow
      title={row.title}
      subtitle={row.detail}
      value={change === undefined ? undefined : format.shortGain(change)}
      accessibilityLabel={spoken.filter((part) => part !== undefined && part !== '').join(', ')}
    />
  );
}
