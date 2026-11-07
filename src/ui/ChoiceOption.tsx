import { Pressable, StyleSheet } from 'react-native';

import { AppText } from './Typography';
import { colors, minimumTouchTarget, radius, spacing } from './tokens';

export function ChoiceOption({
  label,
  accessibilityLabel,
  selected,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceSelected]}
    >
      <AppText variant="heading" style={selected ? styles.labelSelected : undefined}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  choice: {
    flexGrow: 1,
    minHeight: minimumTouchTarget,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  choiceSelected: { backgroundColor: colors.surface },
  labelSelected: { color: colors.accent },
});
