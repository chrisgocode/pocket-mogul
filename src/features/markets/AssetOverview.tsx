import { StyleSheet, View } from 'react-native';

import type { AssetDetail } from '@/application/marketsView';
import { formatPrice } from '@/domain/money';
import { Card } from '@/ui/Card';
import { DetailLine } from '@/ui/DetailLine';
import { LogoMark } from '@/ui/LogoMark';
import { AppText } from '@/ui/Typography';
import { spacing } from '@/ui/tokens';

import { assetSubtitle, dividendLabel } from './AssetQuoteRow';
import { changeBadge, trendOf } from './marketFormat';

export type ListedAsset = Extract<AssetDetail, { status: 'listed' }>;

const LOGO_SIZE = 56;

export function AssetOverview({ detail }: { detail: ListedAsset }) {
  const dividend = dividendLabel(detail);
  return (
    <Card>
      <View style={styles.identity}>
        <LogoMark logo={detail.asset.logo} size={LOGO_SIZE} />
        <AppText variant="caption" muted style={styles.subtitle}>
          {assetSubtitle(detail)}
        </AppText>
      </View>
      <DetailLine label="Price" value={formatPrice(detail.price)} emphasis />
      <DetailLine
        label="This market hour"
        value={changeBadge(detail.hourChangeBps)}
        trend={trendOf(detail.hourChangeBps)}
      />
      {dividend === undefined ? null : <DetailLine label="Dividend" value={dividend} />}
    </Card>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  subtitle: { flex: 1 },
});
