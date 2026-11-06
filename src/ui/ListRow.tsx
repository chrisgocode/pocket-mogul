import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ListRowContent } from './ListRowContent';
import { feedback, minimumTouchTarget, spacing } from './tokens';

export type ListRowProps = {
  leading?: ReactNode;
  title: string;
  subtitle?: string | undefined;
  value?: string | undefined;
  detail?: string | undefined;
  dimmed?: boolean;
  accessibilityLabel?: string;
  onPress?: () => void;
};

export function ListRow(props: ListRowProps) {
  const { title, subtitle, value, detail, dimmed = false, onPress } = props;
  const label =
    props.accessibilityLabel ?? [title, subtitle, value, detail].filter(Boolean).join(', ');
  if (onPress === undefined) {
    return (
      <View style={[styles.row, dimmed && styles.dimmed]} accessible accessibilityLabel={label}>
        <ListRowContent {...props} />
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, dimmed && styles.dimmed, pressed && styles.pressed]}
    >
      <ListRowContent {...props} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: minimumTouchTarget,
  },
  dimmed: { opacity: 0.55 },
  pressed: { transform: [{ scale: feedback.pressedScale }] },
});
