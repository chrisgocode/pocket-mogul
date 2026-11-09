import type { ColorValue } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from './Icons';
import { colors, radius, sectionColors } from './tokens';
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
      <Icon name={name} color={central && focused ? colors.background : color} />
    </View>
  );
}
const styles = StyleSheet.create({
  icon: { alignItems: 'center', justifyContent: 'center' },
  central: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    marginTop: -12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  active: { backgroundColor: sectionColors.earn, borderColor: sectionColors.earn },
});
