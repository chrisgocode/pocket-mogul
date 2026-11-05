import { StyleSheet, View } from 'react-native';

import { AppText } from '@/ui/Typography';
import { colors, spacing } from '@/ui/tokens';

export function OpeningSaveScreen() {
  return (
    <View style={styles.screen}>
      <AppText muted>Opening your save…</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
});
