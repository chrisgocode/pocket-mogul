import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors, radius, sectionColors } from './tokens';
const DRAWINGS: Readonly<Record<string, string>> = {
  vending:
    'M13 6 H42 V50 H13 Z M18 12 H32 V35 H18 Z M36 16 H39 M36 23 H39 M20 42 H35 M18 50 V54 M37 50 V54 M24 12 V35 M18 23 H32',
  food_cart:
    'M7 24 H48 V45 H7 Z M4 24 L12 9 H43 L51 24 M13 45 V51 M42 45 V51 M6 34 H48 M14 10 V24 M25 10 V24 M37 10 V24',
  coffee_kiosk:
    'M9 24 H47 V50 H9 Z M6 24 L14 10 H42 L50 24 M17 30 H32 V41 H17 Z M32 32 H37 V38 H32 M16 46 H39',
  car_wash: 'M6 48 V12 H50 V48 M12 48 V26 H44 V48 M18 39 L21 31 H35 L39 39 V46 H18 Z M12 18 H44',
};
export function BusinessArt({ id }: { id: string }) {
  return (
    <View style={styles.art}>
      <Svg width={44} height={50} viewBox="0 0 56 60" accessibilityElementsHidden>
        <Rect x={9} y={18} width={38} height={32} rx={4} fill={colors.surfaceMuted} />
        <Path
          d={
            DRAWINGS[id] ??
            'M7 26 L15 10 H42 L50 26 M10 26 V51 H47 V26 M17 33 H29 V51 H17 Z M35 33 H41 V40 H35 Z M5 51 H51'
          }
          fill="none"
          stroke={sectionColors.businesses}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
const styles = StyleSheet.create({
  art: {
    width: 52,
    height: 58,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
