import { LockedMechanicCard } from './LockedMechanicCard';
import { LOCKED_DEALS } from './lockedMechanicText';

export function LockedDealsCard({ unlockStage }: { unlockStage: number }) {
  return <LockedMechanicCard text={LOCKED_DEALS} unlockStage={unlockStage} />;
}
