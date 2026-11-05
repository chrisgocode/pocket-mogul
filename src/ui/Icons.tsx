import type { ColorValue } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

export type IconName =
  | 'home'
  | 'businesses'
  | 'markets'
  | 'properties'
  | 'portfolio'
  | 'goals'
  | 'settings';

const PATHS: Record<IconName, string> = {
  home: 'M4 11 L12 4 L20 11 V20 H14 V14 H10 V20 H4 Z',
  businesses: 'M4 9 H20 V20 H4 Z M8 9 V6 A1 1 0 0 1 9 5 H15 A1 1 0 0 1 16 6 V9 M4 13 H20',
  markets: 'M4 19 L9 13 L13 16 L20 7 M15 7 H20 V12',
  properties: 'M5 20 V5 H14 V20 M14 10 H19 V20 M3 20 H21 M8 8 H11 M8 12 H11 M8 16 H11',
  portfolio: 'M12 4 A8 8 0 1 0 20 12 H12 Z M15 3.5 A8 8 0 0 1 20.5 9 H15 Z',
  goals:
    'M8 4 H16 V9 A4 4 0 0 1 8 9 Z M8 6 H5 A3 3 0 0 0 8 10 M16 6 H19 A3 3 0 0 1 16 10 M12 13 V17 M8 20 H16 M9 17 H15 V20 H9 Z',
  settings: '',
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
        <>
          <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={2} />
          <Path
            d="M12 3 V5.5 M12 18.5 V21 M3 12 H5.5 M18.5 12 H21 M5.6 5.6 L7.4 7.4 M16.6 16.6 L18.4 18.4 M5.6 18.4 L7.4 16.6 M16.6 7.4 L18.4 5.6"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Circle cx={12} cy={12} r={6.5} stroke={color} strokeWidth={2} />
        </>
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
