import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { selectRank, selectRankProgress } from '@/application/rankView';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { useMoneyFormat } from '@/features/game/useMoneyFormat';
import { Icon } from '@/ui/Icons';
import { ProgressRing } from '@/ui/ProgressRing';
import { AppText } from '@/ui/Typography';
import { colors, sectionColors, size, spacing } from '@/ui/tokens';

export function HudRank() {
  const router = useRouter();
  const { state } = useGameSnapshot();
  const content = getContent();
  const format = useMoneyFormat();
  const rank = selectRank(state, content);
  const title = rank?.title ?? 'Newcomer';
  const peak = format.short(state.peakNetWorthCents);
  const target = rank?.next === undefined ? peak : format.short(rank.next.thresholdCents);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Rank ${title}, peak net worth ${peak} of ${target}`}
      onPress={() => router.navigate('/portfolio')}
      style={styles.rank}
    >
      <ProgressRing
        diameter={size.hudAvatar}
        thickness={size.hudRing}
        fraction={selectRankProgress(state, content)}
        color={sectionColors.earn}
      >
        <Icon name="profile" color={colors.text} size={size.iconMedium} />
      </ProgressRing>
      <View style={styles.text}>
        <AppText variant="caption" numberOfLines={1} style={styles.title}>
          {title}
        </AppText>
        <AppText variant="micro" muted numberOfLines={1}>
          {peak} / {target}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rank: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  text: { flexShrink: 1 },
  title: { fontWeight: '800' },
});
