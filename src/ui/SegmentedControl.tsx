import { Pressable, StyleSheet, View } from 'react-native';

import { useAccent } from './Accent';
import { AppText } from './Typography';
import { colors, minimumTouchTarget, radius } from './tokens';

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
            style={[styles.segment, isSelected && [styles.selected, { borderBottomColor: accent }]]}
          >
            <AppText variant="heading" style={isSelected ? { color: accent } : styles.label}>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  segment: {
    flex: 1,
    minHeight: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  selected: { borderBottomWidth: 2 },
  label: { color: colors.textMuted },
});
