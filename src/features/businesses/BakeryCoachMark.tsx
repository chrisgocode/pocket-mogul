import { CoachMarkCard } from './CoachMarkCard';

const BODY =
  'Your ovens bake a set share of their capacity every day, and what you bake but do not sell goes stale at your cost. Bake less when the shelves stay full. Wholesale clients offer standing orders: fewer dollars an order, but sold before they are baked, and they are baked before anything goes on the shelf.';

export function BakeryCoachMark({
  unlockStage,
  onDismiss,
}: {
  unlockStage: number;
  onDismiss: () => void;
}) {
  return (
    <CoachMarkCard
      unlockStage={unlockStage}
      title="Oven schedule and wholesale"
      body={BODY}
      onDismiss={onDismiss}
    />
  );
}
