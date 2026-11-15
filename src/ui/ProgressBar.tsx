import { StyleSheet, View } from 'react-native';

import { useAccent } from './Accent';
import { colors, radius, size } from './tokens';

const FULL_PERCENT = 100;

export function ProgressBar({ fraction }: { fraction: number }) {
  const accent = useAccent();
  const percent = Math.round(Math.min(1, Math.max(0, fraction)) * FULL_PERCENT);
  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: FULL_PERCENT, now: percent }}
    >
      <View style={[styles.fill, { width: `${percent}%`, backgroundColor: accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: size.progressBar,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: { height: size.progressBar, borderRadius: radius.pill },
});
