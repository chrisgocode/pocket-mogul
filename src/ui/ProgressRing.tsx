import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors } from './tokens';

const HALF = 0.5;
const TURN_RADIANS = Math.PI / HALF;

type ProgressRingProps = {
  diameter: number;
  thickness: number;
  fraction: number;
  color: string;
  children: ReactNode;
};

export function ProgressRing({
  diameter,
  thickness,
  fraction,
  color,
  children,
}: ProgressRingProps) {
  const centre = diameter * HALF;
  const ringRadius = centre - thickness * HALF;
  const circumference = TURN_RADIANS * ringRadius;
  const shown = Math.min(1, Math.max(0, fraction)) * circumference;
  const ring = { cx: centre, cy: centre, r: ringRadius, strokeWidth: thickness, fill: 'none' };
  return (
    <View style={[styles.ring, { width: diameter, height: diameter }]}>
      <Svg
        width={diameter}
        height={diameter}
        style={StyleSheet.absoluteFill}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Circle {...ring} stroke={colors.surfaceMuted} />
        <Circle
          {...ring}
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={`${shown} ${circumference}`}
          transform={`rotate(-90 ${centre} ${centre})`}
        />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { alignItems: 'center', justifyContent: 'center' },
});
