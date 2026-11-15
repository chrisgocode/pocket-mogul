import { Pressable, StyleSheet, View } from 'react-native';

import { useAccent } from './Accent';
import { AppText } from './Typography';
import { colors, minimumTouchTarget, spacing } from './tokens';

export type SegmentOption<Segment extends string> = { value: Segment; label: string };

export function SegmentedControl<Segment extends string>({
  options,
  selected,
  onSelect,
}: {
  options: readonly SegmentOption<Segment>[];
  selected: Segment;
  onSelect: (segment: Segment) => void;
}) {
  const accent = useAccent();
  return (
    <View style={styles.segments} accessibilityRole="tablist">
      {options.map((option) => {
        const isSelected = option.value === selected;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(option.value)}
            style={styles.segment}
          >
            <View style={[styles.chip, isSelected && { backgroundColor: accent }]}>
              <AppText
                variant="caption"
                numberOfLines={1}
                style={isSelected ? styles.selectedLabel : styles.label}
              >
                {option.label}
              </AppText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const CHIP_RADIUS = 11;
const CHIP_HEIGHT = 32;

const styles = StyleSheet.create({
  segments: { flexDirection: 'row', gap: spacing.xs },
  segment: { flex: 1, minHeight: minimumTouchTarget, justifyContent: 'center' },
  chip: {
    height: CHIP_HEIGHT,
    borderRadius: CHIP_RADIUS,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  label: { color: colors.textMuted, fontWeight: '700' },
  selectedLabel: { color: colors.textOnAccent, fontWeight: '800' },
});
