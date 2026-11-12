import { CoachMarkCard } from './CoachMarkCard';

const BODY =
  'Crowds change every day, so park where the people are and check tomorrow before you settle in. Extra menu items bring more customers or bigger orders, but some slow the line. A wide menu pays on quiet days and a short one keeps a busy line moving.';

export function FoodCartCoachMark({
  unlockStage,
  onDismiss,
}: {
  unlockStage: number;
  onDismiss: () => void;
}) {
  return (
    <CoachMarkCard
      unlockStage={unlockStage}
      title="Spot and menu"
      body={BODY}
      onDismiss={onDismiss}
    />
  );
}
