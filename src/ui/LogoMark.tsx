import type { ReactElement } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import type { Glyph, Logo } from '@/content';

import { radius } from './tokens';

const GLYPH_ART: Record<Glyph, (color: string) => ReactElement> = {
  circle: (c) => <Circle cx={12} cy={12} r={7} fill={c} />,
  square: (c) => <Rect x={5} y={5} width={14} height={14} rx={2.5} fill={c} />,
  triangle: (c) => <Path d="M12 4 L20 19 L4 19 Z" fill={c} />,
  diamond: (c) => <Path d="M12 3 L21 12 L12 21 L3 12 Z" fill={c} />,
  hexagon: (c) => <Path d="M12 3 L19.8 7.5 L19.8 16.5 L12 21 L4.2 16.5 L4.2 7.5 Z" fill={c} />,
  bolt: (c) => <Path d="M13 2 L5 14 H11 L10 22 L19 9 H13 Z" fill={c} />,
  leaf: (c) => <Path d="M5 19 C5 9 11 4 20 4 C20 13 15 19 5 19 Z" fill={c} />,
  drop: (c) => <Path d="M12 3 C12 3 5 11 5 15 A7 7 0 0 0 19 15 C19 11 12 3 12 3 Z" fill={c} />,
  ring: (c) => <Circle cx={12} cy={12} r={6.5} stroke={c} strokeWidth={3.5} fill="none" />,
  bars: (c) => <Path d="M4 20 V12 H8 V20 Z M10 20 V7 H14 V20 Z M16 20 V4 H20 V20 Z" fill={c} />,
  cross: (c) => <Path d="M9 4 H15 V9 H20 V15 H15 V20 H9 V15 H4 V9 H9 Z" fill={c} />,
  star: (c) => (
    <Path
      d="M12 3 L14.6 9 L21 9.3 L16 13.4 L17.7 20 L12 16.3 L6.3 20 L8 13.4 L3 9.3 L9.4 9 Z"
      fill={c}
    />
  ),
  wave: (c) => (
    <Path
      d="M3 9 Q7.5 4 12 9 T21 9 M3 16 Q7.5 11 12 16 T21 16"
      stroke={c}
      strokeWidth={2.8}
      strokeLinecap="round"
      fill="none"
    />
  ),
  arch: (c) => <Path d="M5 20 V11 A7 7 0 0 1 19 11 V20 H15 V12 A3 3 0 0 0 9 12 V20 Z" fill={c} />,
};

export function LogoMark({ logo, size = 40 }: { logo: Logo; size?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Rect
        x={0}
        y={0}
        width={24}
        height={24}
        rx={(radius.md / size) * 24}
        fill={logo.color}
        fillOpacity={0.14}
      />
      {GLYPH_ART[logo.glyph](logo.color)}
    </Svg>
  );
}
