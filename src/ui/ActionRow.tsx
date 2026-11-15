import { StyleSheet, View } from 'react-native';

import { Button } from './Button';
import type { IconName } from './Icons';
import { OptionalCaption } from './OptionalCaption';
import { AppText } from './Typography';
import { colors, spacing } from './tokens';

export type RowAction = {
  label: string;
  accessibilityLabel: string;
  icon?: IconName;
  disabled: boolean;
  onPress: () => void;
};

export function ActionRow({
  title,
  subtitle,
  benefit,
  accessibilityLabel,
  action,
}: {
  title: string;
  subtitle?: string | undefined;
  benefit?: string | undefined;
  accessibilityLabel?: string;
  action: RowAction;
}) {
  const spoken = accessibilityLabel ?? [title, subtitle, benefit].filter(Boolean).join(', ');
  return (
    <View style={styles.row}>
      <View style={styles.main} accessible accessibilityLabel={spoken}>
        <AppText variant="heading" numberOfLines={1}>
          {title}
        </AppText>
        <OptionalCaption text={subtitle} />
        <OptionalCaption
          text={benefit}
          trend={benefit?.startsWith('-') === true ? 'loss' : 'gain'}
        />
      </View>
      <Button
        size="compact"
        icon={action.icon ?? 'upgrade'}
        label={action.label}
        accessibilityLabel={action.accessibilityLabel}
        onPress={action.onPress}
        disabled={action.disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  main: { flex: 1, minWidth: 0, gap: 2 },
});
