import { StyleSheet, View } from 'react-native';

import { ChoiceOption } from './ChoiceOption';
import { AppText } from './Typography';
import { colors, radius, spacing } from './tokens';

export type Choice<Value extends string> = { value: Value; label: string };

export function ChoiceRow<Value extends string>({
  title,
  note,
  choices,
  selected,
  onSelect,
}: {
  title: string;
  note: string;
  choices: readonly Choice<Value>[];
  selected: Value;
  onSelect: (value: Value) => void;
}) {
  return (
    <View style={styles.row}>
      <AppText variant="heading">{title}</AppText>
      <AppText variant="caption" muted>
        {note}
      </AppText>
      <View style={styles.choices} accessibilityRole="radiogroup" accessibilityLabel={title}>
        {choices.map((choice) => (
          <ChoiceOption
            key={choice.value}
            label={choice.label}
            accessibilityLabel={`${title}: ${choice.label}`}
            selected={choice.value === selected}
            onPress={() => onSelect(choice.value)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.xs },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.xs,
    marginTop: spacing.xs,
  },
});
