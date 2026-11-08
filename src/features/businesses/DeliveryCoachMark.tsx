import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { AppText } from '@/ui/Typography';

export function DeliveryCoachMark({
  vansPerDriver,
  onDismiss,
}: {
  vansPerDriver: number;
  onDismiss: () => void;
}) {
  return (
    <Card highlighted>
      <AppText variant="heading">New at Local: contracts and drivers</AppText>
      <AppText muted>
        {`Clients offer contracts that pay more per parcel than walk-ins. Contracts go out first, and every parcel you can't deliver costs its penalty, so check your spare capacity before you accept. Each driver now runs ${vansPerDriver} vans: a van without a driver stays parked. Efficiency becomes the Route planner, which adds parcels per van.`}
      </AppText>
      <Button label="Got it" variant="secondary" onPress={onDismiss} />
    </Card>
  );
}
