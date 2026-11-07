import { StyleSheet, TextInput, View } from 'react-native';

import { AppText } from './Typography';
import { colors, minimumTouchTarget, radius, spacing, type } from './tokens';

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.locked}
        keyboardType="decimal-pad"
        autoCorrect={false}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  input: {
    ...type.number,
    color: colors.text,
    minHeight: minimumTouchTarget,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.chrome,
    paddingHorizontal: spacing.md,
  },
});
