import { CoachMarkCard } from './CoachMarkCard';

export function DeliveryCoachMark({
  unlockStage,
  vansPerDriver,
  onDismiss,
}: {
  unlockStage: number;
  vansPerDriver: number;
  onDismiss: () => void;
}) {
  return (
    <CoachMarkCard
      unlockStage={unlockStage}
      title="Contracts and drivers"
      body={`Clients offer contracts that pay more per parcel than walk-ins. Contracts go out first, and every parcel you can't deliver costs its penalty, so check your spare capacity before you accept. Each driver now runs ${vansPerDriver} vans: a van without a driver stays parked. Efficiency becomes the Route planner, which adds parcels per van.`}
      onDismiss={onDismiss}
    />
  );
}
