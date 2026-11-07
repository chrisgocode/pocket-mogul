import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, highlightWidth, radius, spacing } from './tokens';

export function Card({
  children,
  style,
  highlighted = false,
}: {
  children: ReactNode;
  style?: ViewStyle;
  highlighted?: boolean;
}) {
  return <View style={[styles.card, highlighted && styles.highlighted, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  highlighted: { borderWidth: highlightWidth, borderColor: colors.highlight },
});
