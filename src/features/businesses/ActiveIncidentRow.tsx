import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import { ListRow } from '@/ui/ListRow';

import { dayCount } from './businessFormat';

export function ActiveIncidentRow({ detail }: { detail: OwnedBusinessDetail }) {
  const { active } = detail.risks;
  if (active === undefined) return <ListRow title="No incident right now" />;
  return (
    <ListRow
      title={`${active.name} now`}
      subtitle={active.effect}
      value={`${dayCount(active.daysLeft)} left`}
    />
  );
}
