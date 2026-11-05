import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from './Icons';
import { colors, minimumTouchTarget } from './tokens';

export function HeaderActions() {
  return (
    <View style={styles.row}>
      <Link href="/goals" asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Goals"
          style={styles.button}
          hitSlop={4}
        >
          <Icon name="goals" color={colors.text} />
        </Pressable>
      </Link>
      <Link href="/settings" asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          style={styles.button}
          hitSlop={4}
        >
          <Icon name="settings" color={colors.text} />
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  button: {
    width: minimumTouchTarget,
    height: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
