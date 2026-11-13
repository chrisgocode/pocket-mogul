import { CoachMarkCard } from './CoachMarkCard';

const BODY =
  'Weather scrubs launches. A faster cadence launches more on a clear day and loses more to wind and storms, so set it by the forecast. Payload contracts pay well above the standard price and launch first, but every payload you fail to launch costs its full standard price.';

export function SpaceCoachMark({
  unlockStage,
  onDismiss,
}: {
  unlockStage: number;
  onDismiss: () => void;
}) {
  return (
    <CoachMarkCard
      unlockStage={unlockStage}
      title="Launch cadence and payloads"
      body={BODY}
      onDismiss={onDismiss}
    />
  );
}
