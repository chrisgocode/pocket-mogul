import { View } from 'react-native';

import { holdsEntitlement } from '@/domain/entitlements';
import { useGameSnapshot } from '@/features/game/GameContext';
import { Badge } from '@/ui/Badge';

export function FounderBadge() {
  if (!holdsEntitlement(useGameSnapshot().state, 'founder')) return null;
  return (
    <View accessible accessibilityLabel="Title, Founder">
      <Badge tone="gold" text="FOUNDER" />
    </View>
  );
}
