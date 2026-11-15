import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Badge, type BadgeTone } from './Badge';
import type { IconName } from './Icons';
import { usePressedStyle } from './pressFeedback';
import { colors, highlightWidth, radius, spacing } from './tokens';

export type TileBadge = { tone: BadgeTone; icon: IconName };

export type TileVariant = 'owned' | 'open' | 'locked' | 'highlighted';

type TileProps = {
  children: ReactNode;
  accessibilityLabel: string;
  onPress?: (() => void) | undefined;
  variant?: TileVariant;
  disabled?: boolean;
  badge?: TileBadge | undefined;
};

function tileFrame(variant: TileVariant) {
  return [
    styles.tile,
    variant !== 'owned' && styles.open,
    variant === 'locked' && styles.locked,
    variant === 'highlighted' && styles.highlighted,
  ];
}

export function Tile({
  children,
  accessibilityLabel,
  onPress,
  variant = 'owned',
  disabled = false,
  badge,
}: TileProps) {
  const pressedStyle = usePressedStyle();
  const frame = tileFrame(variant);
  return (
    <View style={styles.cell}>
      {onPress === undefined ? (
        <View style={frame} accessible accessibilityLabel={accessibilityLabel}>
          {children}
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onPress}
          style={({ pressed }) => [frame, pressed && pressedStyle]}
        >
          {children}
        </Pressable>
      )}
      {badge === undefined ? null : (
        <View style={styles.badge} pointerEvents="none">
          <Badge tone={badge.tone} icon={badge.icon} />
        </View>
      )}
    </View>
  );
}

const BADGE_OFFSET = -5;
const TILE_MIN_HEIGHT = 132;

const styles = StyleSheet.create({
  cell: { width: '48.5%' },
  tile: {
    minHeight: TILE_MIN_HEIGHT,
    padding: spacing.md,
    gap: spacing.xs,
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderBottomWidth: 3,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  open: { borderStyle: 'dashed', borderBottomWidth: 1, backgroundColor: colors.transparent },
  locked: { opacity: 0.6 },
  highlighted: {
    borderStyle: 'solid',
    borderWidth: highlightWidth,
    borderBottomWidth: highlightWidth,
    borderColor: colors.highlight,
  },
  badge: { position: 'absolute', top: BADGE_OFFSET, right: BADGE_OFFSET },
});
