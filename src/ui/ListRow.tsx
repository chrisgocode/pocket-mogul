import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from './Typography';
import { spacing, touchTarget } from './tokens';

/** A catalog row: leading mark, title and subtitle, trailing value. */
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
  subtitle?: string;
  value?: string;
  detail?: string;
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
        {subtitle === undefined ? null : (
          <AppText variant="caption" muted>
            {subtitle}
          </AppText>
        )}
      </View>
      <View style={styles.trailing}>
        {value === undefined ? null : <AppText variant="number">{value}</AppText>}
        {detail === undefined ? null : (
          <AppText variant="caption" muted>
            {detail}
          </AppText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: touchTarget },
  dimmed: { opacity: 0.55 },
  main: { flex: 1, gap: 2 },
  trailing: { alignItems: 'flex-end', gap: 2, flexShrink: 0 },
});
