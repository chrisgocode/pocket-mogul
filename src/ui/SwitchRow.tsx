import { StyleSheet, Switch, View } from 'react-native';

import { AppText } from './Typography';
import { colors, minimumTouchTarget, spacing } from './tokens';

export function SwitchRow({
  title,
  note,
  value,
  onChange,
}: {
  title: string;
  note: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <AppText variant="heading">{title}</AppText>
        <AppText variant="caption" muted>
          {note}
        </AppText>
      </View>
      <Switch
        accessibilityLabel={title}
        accessibilityHint={note}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.accentDeep, false: colors.surfaceMuted }}
        thumbColor={value ? colors.accent : colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: minimumTouchTarget,
  },
  text: { flex: 1, gap: 2 },
});
