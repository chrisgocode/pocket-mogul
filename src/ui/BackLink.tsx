import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from './Icons';
import { AppText } from './Typography';
import { colors, minimumTouchTarget, radius, size, spacing } from './tokens';

export function BackLink({ href, label }: { href: Href; label: string }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Back to ${label}`}
      onPress={() => router.dismissTo(href)}
      style={styles.back}
    >
      <View style={styles.disc}>
        <Icon name="back" color={colors.text} size={size.iconSmall} />
      </View>
      <AppText variant="caption" muted>
        {label}
      </AppText>
    </Pressable>
  );
}

const DISC_SIZE = 30;

const styles = StyleSheet.create({
  back: {
    minHeight: minimumTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  disc: {
    width: DISC_SIZE,
    height: DISC_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
