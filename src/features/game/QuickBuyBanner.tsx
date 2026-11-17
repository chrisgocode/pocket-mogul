import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/ui/Typography';
import { colors, radius, spacing } from '@/ui/tokens';

import { useQuickBuyNotices } from './QuickBuyProvider';

export function QuickBuyBanner() {
  const { notice, dismiss } = useQuickBuyNotices();
  if (notice === undefined) return null;
  return (
    <Pressable
      accessibilityRole={notice.tone === 'problem' ? 'alert' : 'button'}
      accessibilityLabel={`${notice.message}. Dismiss`}
      accessibilityLiveRegion="polite"
      onPress={dismiss}
      style={[styles.banner, notice.tone === 'problem' ? styles.problem : styles.gain]}
    >
      <AppText variant="heading" style={styles.text} numberOfLines={2}>
        {notice.message}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  gain: { backgroundColor: colors.gain },
  problem: { backgroundColor: colors.loss },
  text: { color: colors.textOnAccent },
});
