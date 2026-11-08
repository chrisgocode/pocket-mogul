import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { AppText } from './Typography';
import { colors, minimumTouchTarget, spacing } from './tokens';
export function BackLink({ href, label }: { href: Href; label: string }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Back to ${label}`}
      onPress={() => router.navigate(href)}
      style={styles.back}
    >
      <AppText style={styles.label}>← {label}</AppText>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  back: { minHeight: minimumTouchTarget, justifyContent: 'center', paddingRight: spacing.lg },
  label: { color: colors.textMuted },
});
