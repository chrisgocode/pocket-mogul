import { StyleSheet, View } from 'react-native';

import { selectAdOffer } from '@/application/adOfferView';
import { selectHomeAttention } from '@/application/homeAttention';
import { selectTapBoost } from '@/application/tapBoostView';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { RoundButton, type RoundButtonBadge } from '@/ui/RoundButton';
import { spacing } from '@/ui/tokens';

import type { EarnSheetName } from './earnSheet';

const BOOST_RUNNING: RoundButtonBadge = { tone: 'gain', icon: 'check' };

export function EarnRightRail({ onOpen }: { onOpen: (sheet: EarnSheetName) => void }) {
  const snapshot = useGameSnapshot();
  const content = getContent();
  const alerts = selectHomeAttention(snapshot, content).length;
  const boosting = selectTapBoost(snapshot, content).status === 'active';
  const briefcase = selectAdOffer(snapshot, { content, offer: { kind: 'briefcase' } });
  return (
    <View style={styles.rail}>
      <RoundButton
        icon="briefcase"
        label="Briefcase"
        accessibilityLabel="Open Briefcase"
        dimmed={briefcase.status === 'hidden' || briefcase.status === 'used_up'}
        onPress={() => onOpen('briefcase')}
      />
      <RoundButton
        icon="boost"
        label="Boost"
        accessibilityLabel={boosting ? 'Open Boost, boost running' : 'Open Boost'}
        badge={boosting ? BOOST_RUNNING : undefined}
        onPress={() => onOpen('boost')}
      />
      <RoundButton
        icon="alerts"
        label="Alerts"
        accessibilityLabel={alerts > 0 ? `Open Alerts, ${alerts} waiting` : 'Open Alerts'}
        badge={alerts > 0 ? { tone: 'alert', text: String(alerts) } : undefined}
        onPress={() => onOpen('alerts')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rail: { gap: spacing.md, justifyContent: 'center' },
});
