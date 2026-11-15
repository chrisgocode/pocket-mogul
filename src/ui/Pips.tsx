import { StyleSheet, View } from 'react-native';

import { useAccent } from './Accent';
import { colors, radius, size } from './tokens';

export function Pips({ total, filled }: { total: number; filled: number }) {
  const accent = useAccent();
  return (
    <View
      style={styles.pips}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: total }, (_, position) => position + 1).map((step) => (
        <View key={step} style={[styles.pip, step <= filled && { backgroundColor: accent }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pips: { flexDirection: 'row', gap: 3 },
  pip: {
    width: size.pipWidth,
    height: size.pip,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
});
