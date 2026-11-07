import { StyleSheet, View } from 'react-native';

import { Button } from '@/ui/Button';
import { spacing } from '@/ui/tokens';

const PRESETS = [
  { percent: 25, label: '25%' },
  { percent: 50, label: '50%' },
  { percent: 100, label: 'Max' },
] as const;

export function TradePresets({
  basis,
  onPreset,
}: {
  basis: string;
  onPreset: (percent: number) => void;
}) {
  return (
    <View style={styles.row}>
      {PRESETS.map((preset) => (
        <View key={preset.percent} style={styles.cell}>
          <Button
            label={preset.label}
            accessibilityLabel={`${preset.label} of ${basis}`}
            variant="secondary"
            onPress={() => onPreset(preset.percent)}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  cell: { flex: 1 },
});
