import { CoachMarkCard } from './CoachMarkCard';

const BODY =
  'Place machines where people are: busy spots bring more customers. Stock each location with the mix its crowd wants, and keep it filled: a location that runs out sells nothing. Restocking staff refill every location at the start of each day.';

export function VendingCoachMark({
  unlockStage,
  onDismiss,
}: {
  unlockStage: number;
  onDismiss: () => void;
}) {
  return (
    <CoachMarkCard
      unlockStage={unlockStage}
      title="Locations and stock"
      body={BODY}
      onDismiss={onDismiss}
    />
  );
}
