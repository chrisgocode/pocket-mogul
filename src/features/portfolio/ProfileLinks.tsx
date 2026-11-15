import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useGame } from '@/features/game/GameContext';
import { Icon, type IconName } from '@/ui/Icons';
import { usePressedStyle } from '@/ui/pressFeedback';
import { AppText } from '@/ui/Typography';
import { colors, minimumTouchTarget, radius, spacing } from '@/ui/tokens';

type ProfileLink = { label: string; text: string; icon: IconName; href: Href };

const LINKS: ProfileLink[] = [
  { label: 'Goals', text: 'Goals', icon: 'goals', href: '/goals' },
  { label: 'Collection', text: 'Collection', icon: 'collection', href: '/collection' },
  { label: 'Taxes', text: 'Taxes', icon: 'taxes', href: '/taxes' },
  { label: 'Activity log', text: 'Activity', icon: 'activity', href: '/portfolio/activity' },
  { label: 'Settings', text: 'Settings', icon: 'settings', href: '/settings' },
];

const STORE_LINK: ProfileLink = { label: 'Store', text: 'Shop', icon: 'store', href: '/store' };

export function ProfileLinks() {
  const router = useRouter();
  const { storefront } = useGame();
  const pressedStyle = usePressedStyle();
  const links = storefront.status === 'open' ? [STORE_LINK, ...LINKS] : LINKS;
  return (
    <View style={styles.links}>
      {links.map((link) => (
        <Pressable
          key={link.label}
          accessibilityRole="button"
          accessibilityLabel={link.label}
          onPress={() => router.push(link.href)}
          style={({ pressed }) => [styles.link, pressed && pressedStyle]}
        >
          <Icon name={link.icon} color={colors.accent} />
          <AppText variant="micro" muted numberOfLines={1}>
            {link.text}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  link: {
    flexBasis: '30%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    minHeight: minimumTouchTarget,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderBottomWidth: 3,
    borderColor: colors.border,
  },
});
