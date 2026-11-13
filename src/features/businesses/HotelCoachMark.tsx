import { CoachMarkCard } from './CoachMarkCard';

const BODY =
  'Seasons change every few days and move how many guests want a room. Plan a rate for each one: go cheaper to fill rooms in Low season and charge more when an Event fills the town. Stars raise what every guest pays. Earn them with Quality and with enough housekeepers for your room blocks.';

export function HotelCoachMark({
  unlockStage,
  onDismiss,
}: {
  unlockStage: number;
  onDismiss: () => void;
}) {
  return (
    <CoachMarkCard
      unlockStage={unlockStage}
      title="Seasons and stars"
      body={BODY}
      onDismiss={onDismiss}
    />
  );
}
