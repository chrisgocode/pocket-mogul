import type { ActivityRow } from '@/application/activityView';
import { formatCashChange } from '@/features/game/priceFormat';
import { ListRow } from '@/ui/ListRow';

export function ActivityRowView({ row }: { row: ActivityRow }) {
  const amount =
    row.cashChangeCents === undefined ? undefined : formatCashChange(row.cashChangeCents);
  return <ListRow title={row.title} subtitle={row.detail} value={amount} />;
}
