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
      <AppText
        variant="caption"
        numberOfLines={1}
        style={[styles.label, selected && styles.labelSelected]}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  choice: {
    flexGrow: 1,
    minHeight: minimumTouchTarget,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  choiceSelected: { backgroundColor: colors.surface },
  label: { fontWeight: '700', color: colors.text },
  labelSelected: { color: colors.accent },
});
