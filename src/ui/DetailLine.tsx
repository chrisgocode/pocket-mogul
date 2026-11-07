import { StyleSheet, View } from 'react-native';

import { AppText } from './Typography';
import { spacing, trendColors, type Trend } from './tokens';

export function DetailLine({
  label,
  value,
  emphasis = false,
  trend,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  trend?: Trend;
}) {
  const trendStyle = trend === undefined ? undefined : { color: trendColors[trend] };
  return (
    <View style={styles.line} accessible accessibilityLabel={`${label}, ${value}`}>
      <AppText variant={emphasis ? 'heading' : 'body'} muted={!emphasis} style={styles.label}>
        {label}
      </AppText>
      <AppText variant={emphasis ? 'heading' : 'number'} style={trendStyle}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    columnGap: spacing.md,
  },
  label: { flexShrink: 1 },
});
