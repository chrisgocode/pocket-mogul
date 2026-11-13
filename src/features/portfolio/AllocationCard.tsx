import { StyleSheet, View } from 'react-native';
import type { Worth } from '@/application/portfolioView';
import { formatMoneyExact, moneyCents, type MoneyCents } from '@/domain/money';
import { DetailLine } from '@/ui/DetailLine';
import { colors, sectionColors, spacing } from '@/ui/tokens';
const SHARE_SCALE = 10_000n;
const PERCENT_SCALE = 100;
export function AllocationCard({ worth }: { worth: Worth }) {
  const total = worth.cashCents + worth.assetsCents;
  const parts: { label: string; value: MoneyCents; color: string }[] = [
    { label: 'Cash', value: worth.cashCents, color: colors.textMuted },
    { label: 'Businesses', value: worth.businessesCents, color: sectionColors.businesses },
    { label: 'Properties', value: worth.propertiesCents, color: sectionColors.properties },
    { label: 'Collection', value: worth.collectionCents, color: sectionColors.earn },
    { label: 'Markets', value: worth.positionsCents, color: sectionColors.markets },
    {
      label: 'Pending dividends',
      value: worth.pendingDividendsCents,
      color: sectionColors.profile,
    },
  ];
  const share = (value: MoneyCents) =>
    total > 0n ? Number((value * SHARE_SCALE) / total) / PERCENT_SCALE : 0;
  return (
    <View style={styles.content}>
      <View style={styles.bar} accessibilityLabel="Asset allocation">
        {parts.map((part) => (
          <View key={part.label} style={{ flex: share(part.value), backgroundColor: part.color }} />
        ))}
      </View>
      {parts.map((part) => (
        <DetailLine
          key={part.label}
          label={part.label}
          value={`${formatMoneyExact(part.value)} · ${share(part.value).toFixed(1)}%`}
        />
      ))}
      <DetailLine
        label="Tax liability"
        value={formatMoneyExact(moneyCents(0n - worth.taxLiabilityCents))}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  content: { gap: spacing.md },
  bar: { flexDirection: 'row', height: 6, backgroundColor: colors.border },
});
