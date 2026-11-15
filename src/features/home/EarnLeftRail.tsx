import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { selectBriefing } from '@/application/briefingView';
import { selectShelf } from '@/application/collectionSetsView';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { RoundButton, type RoundButtonBadge } from '@/ui/RoundButton';
import { spacing } from '@/ui/tokens';

import type { EarnSheetName } from './earnSheet';
import { ShopButton } from './ShopButton';

const REWARD_READY: RoundButtonBadge = { tone: 'gold', icon: 'warning' };

export function EarnLeftRail({ onOpen }: { onOpen: (sheet: EarnSheetName) => void }) {
  const router = useRouter();
  const { state } = useGameSnapshot();
  const briefing = selectBriefing(state, getContent());
  const { showpiece } = selectShelf(state, getContent());
  const rewardReady = briefing.status === 'shown' && briefing.claimableCents > 0n;
  const onShow = showpiece === undefined ? '' : `, on show: ${showpiece.name}`;
  return (
    <View style={styles.rail}>
      <RoundButton
        icon="daily"
        label="Daily"
        accessibilityLabel={rewardReady ? 'Open Daily, reward ready' : 'Open Daily'}
        badge={rewardReady ? REWARD_READY : undefined}
        dimmed={briefing.status === 'hidden'}
        onPress={() => onOpen('daily')}
      />
      <RoundButton
        icon="richList"
        label="Rich List"
        accessibilityLabel="Open Rich List"
        onPress={() => router.push('/rich-list')}
      />
      <RoundButton
        icon="collection"
        label="Collection"
        accessibilityLabel={`Open Collection${onShow}`}
        onPress={() => router.push('/collection')}
      />
      <ShopButton />
    </View>
  );
}

const styles = StyleSheet.create({
  rail: { gap: spacing.md, justifyContent: 'center' },
});
