import { CoachMarkCard } from './CoachMarkCard';

const BODY =
  'Almost half your customers come in a short morning rush, and the ones you cannot serve in time walk away. A rush plan serves them faster at a cost, and more kiosks or baristas help too. Better beans sell for more and cost more a cup, so they pay once you have customers to spare.';

export function CoffeeKioskCoachMark({
  unlockStage,
  onDismiss,
}: {
  unlockStage: number;
  onDismiss: () => void;
}) {
  return (
    <CoachMarkCard
      unlockStage={unlockStage}
      title="Morning rush and beans"
      body={BODY}
      onDismiss={onDismiss}
    />
  );
}
