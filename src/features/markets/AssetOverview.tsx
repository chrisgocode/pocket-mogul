import { StyleSheet, View } from 'react-native';

import type { AssetDetail } from '@/application/marketsView';
import { formatPrice, formatPriceCompact } from '@/domain/money';
import { DetailLine } from '@/ui/DetailLine';
import { LogoMark } from '@/ui/LogoMark';
import { AppText } from '@/ui/Typography';
import { spacing, trendColors } from '@/ui/tokens';

import { assetSubtitle, dividendLabel } from './AssetQuoteRow';
import { changeBadge, trendOf } from './marketFormat';

export type ListedAsset = Extract<AssetDetail, { status: 'listed' }>;

const LOGO_SIZE = 48;

export function AssetOverview({ detail }: { detail: ListedAsset }) {
  const dividend = dividendLabel(detail);
  const price = formatPrice(detail.price);
  const change = changeBadge(detail.hourChangeBps);
  return (
    <View style={styles.hero}>
      <View style={styles.identity}>
        <LogoMark logo={detail.asset.logo} size={LOGO_SIZE} />
        <AppText variant="caption" muted style={styles.subtitle}>
          {assetSubtitle(detail)}
        </AppText>
      </View>
      <View style={styles.price}>
        <AppText variant="display" accessibilityLabel={`Price, ${price}`}>
          {formatPriceCompact(detail.price)}
        </AppText>
        <AppText
          variant="number"
          accessibilityLabel={`This market hour, ${change}`}
          style={{ color: trendColors[trendOf(detail.hourChangeBps)] }}
        >
          {change}
        </AppText>
      </View>
      {dividend === undefined ? null : <DetailLine label="Dividend" value={dividend} />}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.sm },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  subtitle: { flex: 1 },
  price: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.md },
});
