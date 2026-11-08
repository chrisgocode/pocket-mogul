import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

import { selectMarketNews } from '@/application/marketNews';
import { selectAssetDetail } from '@/application/marketsView';
import { FICTIONAL_NOTICE, getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';
import { Section } from '@/ui/Section';
import { AppText } from '@/ui/Typography';

import { AssetAbout } from './AssetAbout';
import { AssetOverview } from './AssetOverview';
import { DividendCard } from './DividendCard';
import { NewsList } from './NewsList';
import { PositionCard } from './PositionCard';
import { PriceChartCard } from './PriceChartCard';
import { tradeUnits } from './tradeUnits';
import { AssetTrading } from './AssetTrading';

const NEWS_ITEMS = 3;

export function AssetDetailScreen() {
  const { assetId } = useLocalSearchParams<{ assetId: string }>();
  const snapshot = useGameSnapshot();
  const content = getContent();
  const detail = selectAssetDetail(snapshot, { assetId, content });
  if (detail.status === 'unknown') {
    return (
      <Screen tone="markets">
        <Stack.Screen options={{ title: 'Asset' }} />
        <EmptyState title="Asset not found" message="Pick a stock or coin from Markets." />
      </Screen>
    );
  }
  const market = detail.kind === 'stock' ? 'stocks' : 'crypto';
  const units = tradeUnits(detail.kind);
  const news = selectMarketNews(snapshot.state, { market, content, assetId, limit: NEWS_ITEMS });
  return (
    <Screen tone="markets">
      <Stack.Screen options={{ title: detail.asset.name }} />
      <AssetOverview detail={detail} />
      {detail.position === undefined ? null : (
        <PositionCard position={detail.position} units={units} />
      )}
      {detail.dividends === undefined ? null : <DividendCard dividends={detail.dividends} />}
      <AssetTrading detail={detail} units={units} />
      <PriceChartCard detail={detail} />
      <AssetAbout detail={detail} />
      <Section title="News" note={`Recent events that moved ${detail.asset.name}`}>
        <NewsList items={news} empty={`No recent news about ${detail.asset.name}.`} />
      </Section>
      <AppText variant="caption" muted style={styles.notice}>
        {FICTIONAL_NOTICE}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: { textAlign: 'center' },
});
