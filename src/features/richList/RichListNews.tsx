import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/ui/Typography';
import { colors, radius, spacing } from '@/ui/tokens';

import { useRichListNews } from './useRichListNews';

export function RichListNews() {
  const { message, dismiss } = useRichListNews();
  if (message === undefined) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${message}. Dismiss`}
      accessibilityLiveRegion="polite"
      onPress={dismiss}
      style={styles.banner}
    >
      <AppText variant="heading" style={styles.text} numberOfLines={2}>
        {message}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: { padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.text },
  text: { color: colors.textOnAccent },
});
