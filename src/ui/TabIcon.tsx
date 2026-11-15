import type { ColorValue } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from './Icons';
import { colors, radius, sectionColors, size } from './tokens';

export function TabIcon({
  name,
  color,
  focused,
}: {
  name: IconName;
  color: ColorValue;
  focused: boolean;
}) {
  const central = name === 'home';
  return (
    <View style={[styles.icon, central && styles.central, central && focused && styles.active]}>
      <Icon
        name={name}
        color={central ? colors.background : color}
        size={central ? size.tabCentreIcon : size.tabIcon}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { alignItems: 'center', justifyContent: 'center' },
  central: {
    width: size.tabCentre,
    height: size.tabCentre,
    borderRadius: radius.pill,
    backgroundColor: colors.textMuted,
    marginTop: size.tabCentreLift,
    borderWidth: 4,
    borderColor: colors.background,
  },
  active: { backgroundColor: sectionColors.earn },
});
