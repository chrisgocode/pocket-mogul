import type { FleetView, ReputationView } from '@/application/deliveryView';
import { Card } from '@/ui/Card';
import { DetailLine } from '@/ui/DetailLine';
import { ListRow } from '@/ui/ListRow';

import { parcels, starText } from './deliveryFormat';

function onTimeText(reputation: ReputationView): string {
  if (reputation.onTimePercent === undefined) return 'No contract parcels yet';
  return `${reputation.onTimePercent}% on time over ${reputation.windowDays} days`;
}

export function ReputationCard({
  reputation,
  fleet,
}: {
  reputation: ReputationView;
  fleet: FleetView;
}) {
  return (
    <Card>
      <ListRow
        title="Reputation"
        subtitle={`${onTimeText(reputation)} · Better reputation brings bigger offers at better rates`}
        value={starText(reputation.stars)}
        accessibilityLabel={`Reputation ${reputation.stars} of 5 stars`}
      />
      <DetailLine
        label="Vans with drivers"
        value={`${fleet.crewed} of ${fleet.vans} · ${fleet.vansPerDriver} per driver`}
      />
      <DetailLine label="Spare for walk-ins" value={`${parcels(fleet.spareParcels)} parcels/day`} />
    </Card>
  );
}
