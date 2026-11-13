import { CoachMarkCard } from './CoachMarkCard';

const BODY =
  'Your lines make one product at a time. Finer products sell for more to fewer buyers, so they pay when buyers outnumber what you can make. Switching product retools the lines and halves output for a while. Bulk orders pay above the standard price and are made first, but every batch you fail to make costs a penalty.';

export function FactoryCoachMark({
  unlockStage,
  onDismiss,
}: {
  unlockStage: number;
  onDismiss: () => void;
}) {
  return (
    <CoachMarkCard
      unlockStage={unlockStage}
      title="Products and bulk orders"
      body={BODY}
      onDismiss={onDismiss}
    />
  );
}
