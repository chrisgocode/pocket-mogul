import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './Typography';
import { colors, minimumTouchTarget, radius, spacing } from './tokens';

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
            style={[styles.segment, isSelected && styles.segmentSelected]}
          >
            <AppText variant="heading" style={isSelected ? styles.labelSelected : undefined}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segments: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.xs,
  },
  segment: {
    flex: 1,
    minHeight: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  segmentSelected: { backgroundColor: colors.surface },
  labelSelected: { color: colors.accent },
});
