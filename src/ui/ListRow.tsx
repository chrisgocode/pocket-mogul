import { Pressable, StyleSheet, View } from 'react-native';

import { ListRowContent, type ListRowProps } from './ListRowContent';
import { usePressedStyle } from './pressFeedback';
import { colors, minimumTouchTarget, spacing } from './tokens';

export function ListRow(props: ListRowProps) {
  const { title, subtitle, value, detail, dimmed = false, onPress } = props;
  const pressedStyle = usePressedStyle();
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
      style={({ pressed }) => [styles.row, dimmed && styles.dimmed, pressed && pressedStyle]}
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
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dimmed: { opacity: 0.55 },
});
