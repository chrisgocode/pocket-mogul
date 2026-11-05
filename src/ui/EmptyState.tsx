import { StyleSheet, View } from 'react-native';

import { AppText } from './Typography';
import { colors, radius, spacing } from './tokens';

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <View style={styles.box} accessibilityRole="summary">
      <AppText variant="heading">{title}</AppText>
      <AppText muted>{message}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.xs,
    alignItems: 'center',
  },
});
