import type { ColorValue } from 'react-native';
import { Circle, Path } from 'react-native-svg';

const SPOKES =
  'M12 3 V5.5 M12 18.5 V21 M3 12 H5.5 M18.5 12 H21 M5.6 5.6 L7.4 7.4 M16.6 16.6 L18.4 18.4 M5.6 18.4 L7.4 16.6 M16.6 7.4 L18.4 5.6';

export function SettingsGlyph({ color }: { color: ColorValue }) {
  return (
    <>
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={2} />
      <Path d={SPOKES} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={12} cy={12} r={6.5} stroke={color} strokeWidth={2} />
    </>
  );
}
