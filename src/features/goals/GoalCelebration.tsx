import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/ui/Typography';
import { colors, radius, spacing } from '@/ui/tokens';

import { GoalBadge } from './GoalBadge';
import { useGoalCelebration } from './useGoalCelebration';

export function GoalCelebration() {
  const { titles, dismiss } = useGoalCelebration();
  if (titles === undefined || titles.length === 0) return null;
  const message = `Goal reached: ${titles.join(' · ')}`;
  return (
    <SafeAreaView edges={['top']} style={styles.overlay} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${message}. Dismiss`}
        accessibilityLiveRegion="polite"
        onPress={dismiss}
        style={styles.banner}
      >
        <GoalBadge reached />
        <AppText variant="heading" style={styles.text} numberOfLines={2}>
          {message}
        </AppText>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.text,
  },
  text: { flex: 1, color: colors.textOnAccent },
});
