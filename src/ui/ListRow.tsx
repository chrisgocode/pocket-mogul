import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { OptionalCaption } from './OptionalCaption';
import { AppText } from './Typography';
import { spacing, minimumTouchTarget } from './tokens';

export function ListRow({
  leading,
  title,
  subtitle,
  value,
  detail,
  dimmed = false,
}: {
  leading?: ReactNode;
  title: string;
  subtitle?: string | undefined;
  value?: string | undefined;
  detail?: string | undefined;
  dimmed?: boolean;
}) {
  return (
    <View
      style={[styles.row, dimmed && styles.dimmed]}
      accessible
      accessibilityLabel={[title, subtitle, value, detail].filter(Boolean).join(', ')}
    >
      {leading}
      <View style={styles.main}>
        <AppText variant="heading" numberOfLines={2}>
          {title}
        </AppText>
        <OptionalCaption text={subtitle} />
      </View>
      <View style={styles.trailing}>
        {value === undefined ? null : <AppText variant="number">{value}</AppText>}
        <OptionalCaption text={detail} />
      </View>
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
  dimmed: { opacity: 0.55 },
  main: { flex: 1, gap: 2 },
  trailing: { alignItems: 'flex-end', gap: 2, flexShrink: 0 },
});
