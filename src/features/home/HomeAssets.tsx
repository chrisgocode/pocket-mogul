import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { selectPortfolio } from '@/application/portfolioView';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { useMoneyFormat } from '@/features/game/useMoneyFormat';
import { AppText } from '@/ui/Typography';
import { colors, minimumTouchTarget, spacing } from '@/ui/tokens';
export function HomeAssets() {
  const view = selectPortfolio(useGameSnapshot(), getContent());
  const format = useMoneyFormat();
  const items: { label: string; href: Href; count: number; value: string }[] = [
    {
      label: 'Businesses',
      href: '/businesses',
      count: view.holdings.businesses.length,
      value: format.money(view.worth.businessesCents),
    },
    {
      label: 'Investments',
      href: '/markets',
      count: view.holdings.positions.length,
      value: format.money(view.worth.positionsCents),
    },
    {
      label: 'Properties',
      href: '/properties',
      count: view.holdings.properties.length,
      value: format.money(view.worth.propertiesCents),
    },
  ];
  return (
    <View style={styles.row}>
      {items.map((item) => (
        <Link key={item.label} href={item.href} asChild>
          <Pressable accessibilityRole="button" style={styles.item}>
            <AppText variant="caption" muted>
              {item.label}
            </AppText>
            <AppText variant="title">{item.count}</AppText>
            <AppText variant="caption">{item.value}</AppText>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  item: { flex: 1, minHeight: minimumTouchTarget, gap: spacing.xs },
});
