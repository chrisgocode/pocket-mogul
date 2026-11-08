import { StyleSheet, View } from 'react-native';
import { AppText } from './Typography';
import { spacing } from './tokens';
export function StatPair({
  left,
  right,
}: {
  left: { label: string; value: string };
  right: { label: string; value: string };
}) {
  return (
    <View style={styles.row}>
      {[left, right].map((stat) => (
        <View key={stat.label} style={styles.stat}>
          <AppText variant="caption" muted>
            {stat.label}
          </AppText>
          <AppText variant="number">{stat.value}</AppText>
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.lg },
  stat: { flex: 1, gap: spacing.xs },
});
