import { CoachMarkCard } from './CoachMarkCard';

const BODY =
  'Your network splits the fleet across short, medium and long-haul routes. Longer routes earn more a seat, fly fewer seats and burn far more fuel, so the fuel price decides which network pays. Check the forecast before you move: changing network mid-day repositions planes and costs seats for the rest of the day.';

export function AirlineCoachMark({
  unlockStage,
  onDismiss,
}: {
  unlockStage: number;
  onDismiss: () => void;
}) {
  return (
    <CoachMarkCard
      unlockStage={unlockStage}
      title="Routes and fuel"
      body={BODY}
      onDismiss={onDismiss}
    />
  );
}
