import { CoachMarkCard } from './CoachMarkCard';

const BODY =
  'Members pay every day and use studio time before day-pass visitors. New members join daily and a share leaves daily, so your membership settles where the two meet. A higher tier pays more a member and loses members faster. Classes keep members longer and take studio time.';

export function GymCoachMark({
  unlockStage,
  onDismiss,
}: {
  unlockStage: number;
  onDismiss: () => void;
}) {
  return (
    <CoachMarkCard
      unlockStage={unlockStage}
      title="Memberships and classes"
      body={BODY}
      onDismiss={onDismiss}
    />
  );
}
