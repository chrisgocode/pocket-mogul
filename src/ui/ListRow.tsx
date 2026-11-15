import { Pressable, StyleSheet, View } from 'react-native';

import { ListRowContent, type ListRowProps } from './ListRowContent';
import { usePressedStyle } from './pressFeedback';
import { colors, minimumTouchTarget, radius, spacing } from './tokens';

export function ListRow(props: ListRowProps) {
  const { title, subtitle, value, detail, dimmed = false, variant = 'line', onPress } = props;
  const pressedStyle = usePressedStyle();
  const frame = variant === 'card' ? styles.card : styles.line;
  const label =
    props.accessibilityLabel ?? [title, subtitle, value, detail].filter(Boolean).join(', ');
  if (onPress === undefined) {
    return (
      <View
        style={[styles.row, frame, dimmed && styles.dimmed]}
        accessible
        accessibilityLabel={label}
      >
        <ListRowContent {...props} />
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, frame, dimmed && styles.dimmed, pressed && pressedStyle]}
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
    paddingVertical: spacing.sm,
  },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  card: {
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dimmed: { opacity: 0.55 },
});
