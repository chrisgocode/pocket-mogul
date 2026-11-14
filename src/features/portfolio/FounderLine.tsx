import { holdsEntitlement } from '@/domain/entitlements';
import { useGameSnapshot } from '@/features/game/GameContext';
import { DetailLine } from '@/ui/DetailLine';

export function FounderLine() {
  if (!holdsEntitlement(useGameSnapshot().state, 'founder')) return null;
  return <DetailLine label="Title" value="Founder" emphasis />;
}
