import { CoachMarkCard } from './CoachMarkCard';

const BODY =
  'Walk-ins pick a package, and bigger packages hold a bay longer. Rain keeps drivers away and the day after brings them back in crowds, so check the forecast. Members pay every day whatever the weather, but their washes take bay time first.';

export function CarWashCoachMark({
  unlockStage,
  onDismiss,
}: {
  unlockStage: number;
  onDismiss: () => void;
}) {
  return (
    <CoachMarkCard
      unlockStage={unlockStage}
      title="Packages and memberships"
      body={BODY}
      onDismiss={onDismiss}
    />
  );
}
