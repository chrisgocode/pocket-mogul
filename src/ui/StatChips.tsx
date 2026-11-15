import { StyleSheet, View } from 'react-native';

import { AppText } from './Typography';
import { colors, spacing, trendColors, type Trend } from './tokens';

export type StatChip = { label: string; value: string; trend?: Trend; accessibilityLabel?: string };

export function StatChips({ stats }: { stats: readonly StatChip[] }) {
  return (
    <View style={styles.row}>
      {stats.map((stat) => (
        <View
          key={stat.label}
          style={styles.chip}
          accessible
          accessibilityLabel={stat.accessibilityLabel ?? `${stat.label}, ${stat.value}`}
        >
          <AppText variant="label" muted numberOfLines={1}>
            {stat.label}
          </AppText>
          <AppText
            variant="number"
            numberOfLines={1}
            adjustsFontSizeToFit
            style={stat.trend === undefined ? undefined : { color: trendColors[stat.trend] }}
          >
            {stat.value}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const CHIP_RADIUS = 13;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: CHIP_RADIUS,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
