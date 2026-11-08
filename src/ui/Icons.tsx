import type { ColorValue } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { SettingsGlyph } from './SettingsGlyph';

export type IconName =
  | 'home'
  | 'businesses'
  | 'markets'
  | 'properties'
  | 'portfolio'
  | 'goals'
  | 'settings'
  | 'profile'
  | 'taxes';

const PATHS: Record<IconName, string> = {
  home: 'M13 2 L5 14 H11 L10 22 L19 9 H13 Z',
  businesses: 'M4 9 H20 V20 H4 Z M8 9 V6 A1 1 0 0 1 9 5 H15 A1 1 0 0 1 16 6 V9 M4 13 H20',
  markets: 'M4 19 L9 13 L13 16 L20 7 M15 7 H20 V12',
  properties: 'M5 20 V5 H14 V20 M14 10 H19 V20 M3 20 H21 M8 8 H11 M8 12 H11 M8 16 H11',
  portfolio: 'M12 4 A8 8 0 1 0 20 12 H12 Z M15 3.5 A8 8 0 0 1 20.5 9 H15 Z',
  goals:
    'M8 4 H16 V9 A4 4 0 0 1 8 9 Z M8 6 H5 A3 3 0 0 0 8 10 M16 6 H19 A3 3 0 0 1 16 10 M12 13 V17 M8 20 H16 M9 17 H15 V20 H9 Z',
  settings: '',
  profile: 'M8 8 A4 4 0 1 0 16 8 A4 4 0 1 0 8 8 M4 22 V19 A8 8 0 0 1 20 19 V22',
  taxes: 'M6 3 H18 V22 L15 20 L12 22 L9 20 L6 22 Z M9 8 H15 M9 12 H15 M9 16 H13',
};

export function Icon({
  name,
  color,
  size = 24,
}: {
  name: IconName;
  color: ColorValue;
  size?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {name === 'settings' ? (
        <SettingsGlyph color={color} />
      ) : (
        <Path
          d={PATHS[name]}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}
