import { CoachMarkCard } from './CoachMarkCard';

const BODY =
  'Some customers bring big loads. Jumbo machines wash them at a higher price but turn over more slowly, so give them just enough of the floor. Service washes are drop-off loads at a premium that take machine time first. Each level needs an attendant, and each extra level sells for less.';

export function LaundromatCoachMark({
  unlockStage,
  onDismiss,
}: {
  unlockStage: number;
  onDismiss: () => void;
}) {
  return (
    <CoachMarkCard
      unlockStage={unlockStage}
      title="Machine mix and service washes"
      body={BODY}
      onDismiss={onDismiss}
    />
  );
}
