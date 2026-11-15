import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useGame } from '@/features/game/GameContext';
import { Icon, type IconName } from '@/ui/Icons';
import { AppText } from '@/ui/Typography';
import { colors, minimumTouchTarget, radius, spacing } from '@/ui/tokens';
const LINKS: { label: string; icon: IconName; href: Href }[] = [
  { label: 'Goals', icon: 'goals', href: '/goals' },
  { label: 'Collection', icon: 'collection', href: '/collection' },
  { label: 'Taxes', icon: 'taxes', href: '/taxes' },
  { label: 'Settings', icon: 'settings', href: '/settings' },
];
const STORE_LINK = { label: 'Store', icon: 'store', href: '/store' } as const;
export function ProfileLinks() {
  const router = useRouter();
  const { storefront } = useGame();
  const links = storefront.status === 'open' ? [STORE_LINK, ...LINKS] : LINKS;
  return (
    <View style={styles.links}>
      {links.map((link) => (
        <View key={link.label} style={styles.wrapper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={link.label}
            onPress={() => router.push(link.href)}
            style={styles.link}
          >
            <Icon name={link.icon} color={colors.text} />
            <AppText variant="caption" numberOfLines={1} adjustsFontSizeToFit>
              {link.label}
            </AppText>
          </Pressable>
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  links: { flexDirection: 'row', gap: spacing.sm },
  wrapper: { flex: 1 },
  link: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    minHeight: minimumTouchTarget,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
