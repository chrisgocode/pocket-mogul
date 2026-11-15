import { StyleSheet, View } from 'react-native';

import { selectRank, selectRankProgress } from '@/application/rankView';
import { getContent } from '@/content';
import { formatMoneyCompact } from '@/domain/money';
import { useGameSnapshot } from '@/features/game/GameContext';
import { Card } from '@/ui/Card';
import { ProgressBar } from '@/ui/ProgressBar';
import { AppText } from '@/ui/Typography';
import { spacing } from '@/ui/tokens';
import { FounderBadge } from './FounderBadge';

export function RankLines() {
  const { state } = useGameSnapshot();
  const rank = selectRank(state, getContent());
  if (rank === undefined) return null;
  const next =
    rank.next === undefined
      ? 'Top rank reached'
      : `${rank.next.title} at ${formatMoneyCompact(rank.next.thresholdCents)} peak net worth`;
  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.title}>
          <AppText variant="heading" accessibilityLabel={`Rank, ${rank.title}`}>
            {rank.title}
          </AppText>
          <FounderBadge />
        </View>
        <AppText
          variant="caption"
          muted
          numberOfLines={1}
          style={styles.next}
          accessibilityLabel={`Next rank, ${next}`}
        >
          {rank.next === undefined ? next : `Next: ${rank.next.title}`}
        </AppText>
      </View>
      <ProgressBar fraction={selectRankProgress(state, getContent())} />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  next: { flexShrink: 1 },
});
