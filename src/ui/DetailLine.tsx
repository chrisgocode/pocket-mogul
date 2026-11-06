import { StyleSheet, View } from 'react-native';

import { AppText } from './Typography';
import { spacing } from './tokens';

export function DetailLine({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <View style={styles.line} accessible accessibilityLabel={`${label}, ${value}`}>
      <AppText variant={emphasis ? 'heading' : 'body'} muted={!emphasis}>
        {label}
      </AppText>
      <AppText variant={emphasis ? 'heading' : 'number'}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
});
