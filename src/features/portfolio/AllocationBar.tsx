import { StyleSheet, View } from 'react-native';

import type { Worth } from '@/application/portfolioView';
import { colors, radius } from '@/ui/tokens';

import { allocationParts } from './allocation';

export function AllocationBar({ worth }: { worth: Worth }) {
  return (
    <View style={styles.bar} accessibilityLabel="Asset allocation">
      {allocationParts(worth).map((part) => (
        <View key={part.label} style={{ flex: part.share, backgroundColor: part.color }} />
      ))}
    </View>
  );
}

const BAR_HEIGHT = 10;

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    height: BAR_HEIGHT,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
});
