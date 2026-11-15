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
  | 'collection'
  | 'settings'
  | 'profile'
  | 'taxes'
  | 'store'
  | 'coin'
  | 'daily'
  | 'richList'
  | 'briefcase'
  | 'boost'
  | 'alerts'
  | 'back'
  | 'upgrade'
  | 'lock'
  | 'activity'
  | 'check'
  | 'warning';

const PATHS: Record<IconName, string> = {
  home: 'M13 2 L5 14 H11 L10 22 L19 9 H13 Z',
  businesses: 'M4 9 H20 V20 H4 Z M8 9 V6 A1 1 0 0 1 9 5 H15 A1 1 0 0 1 16 6 V9 M4 13 H20',
  markets: 'M4 19 L9 13 L13 16 L20 7 M15 7 H20 V12',
  properties: 'M5 20 V5 H14 V20 M14 10 H19 V20 M3 20 H21 M8 8 H11 M8 12 H11 M8 16 H11',
  portfolio: 'M12 4 A8 8 0 1 0 20 12 H12 Z M15 3.5 A8 8 0 0 1 20.5 9 H15 Z',
  goals:
    'M8 4 H16 V9 A4 4 0 0 1 8 9 Z M8 6 H5 A3 3 0 0 0 8 10 M16 6 H19 A3 3 0 0 1 16 10 M12 13 V17 M8 20 H16 M9 17 H15 V20 H9 Z',
  collection: 'M4 5 H20 V19 H4 Z M7 8 H17 V16 H7 Z M9 14 L11.5 11 L13.5 13 L15 11.5 V14 Z',
  settings: '',
  profile: 'M8 8 A4 4 0 1 0 16 8 A4 4 0 1 0 8 8 M4 22 V19 A8 8 0 0 1 20 19 V22',
  taxes: 'M6 3 H18 V22 L15 20 L12 22 L9 20 L6 22 Z M9 8 H15 M9 12 H15 M9 16 H13',
  store: 'M5 8 H19 L18 21 H6 Z M9 11 V6 A3 3 0 0 1 15 6 V11',
  coin: 'M12 3 A9 9 0 1 0 12 21 A9 9 0 1 0 12 3 M12 6.5 V17.5 M15 9.5 C14.5 7.5 9.5 7.5 9.5 10 C9.5 12.5 15 11.5 15 14 C15 16.5 9.5 16.5 9 14.5',
  daily: 'M5 6 H19 V20 H5 Z M5 10 H19 M9 4 V7 M15 4 V7 M9 15 L11 17 L15 13',
  richList: 'M4 18 L3 8 L8 12 L12 5 L16 12 L21 8 L20 18 Z M4 21 H20',
  briefcase: 'M3 8 H21 V19 H3 Z M9 8 V5 H15 V8 M3 13 H10 M14 13 H21 M10 11.5 H14 V14.5 H10 Z',
  boost: 'M6 12 L12 6 L18 12 M6 19 L12 13 L18 19',
  alerts: 'M6 17 V11 A6 6 0 0 1 18 11 V17 L20 19 H4 Z M10 22 H14',
  back: 'M15 5 L8 12 L15 19',
  upgrade: 'M12 19 V6 M6 12 L12 6 L18 12',
  lock: 'M6 11 H18 V21 H6 Z M8 11 V8 A4 4 0 0 1 16 8 V11',
  activity: 'M12 4 A8 8 0 1 0 12 20 A8 8 0 1 0 12 4 M12 8 V12 L15 14',
  check: 'M5 12 L10 17 L19 7',
  warning: 'M12 5 V13 M12 18 V18.5',
};

export function Icon({
  name,
  color,
  size = 24,
  strokeWidth = 2,
}: {
  name: IconName;
  color: ColorValue;
  size?: number;
  strokeWidth?: number;
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
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}
