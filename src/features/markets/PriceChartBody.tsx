import { priceChart, type ChartRange } from '@/application/priceChart';
import { getContent } from '@/content';
import { LineChart } from '@/ui/LineChart';
import { AppText } from '@/ui/Typography';

import type { ListedAsset } from './AssetOverview';
import { chartRangeText, trendOf } from './marketFormat';
import { useMarketHistory } from './useMarketHistory';

export function PriceChartBody({ detail, range }: { detail: ListedAsset; range: ChartRange }) {
  const read = useMarketHistory(detail.asset.id);
  if (read.status === 'failed') {
    return <AppText muted>Price history can't be read right now. Prices are unaffected.</AppText>;
  }
  if (read.status !== 'loaded') return <AppText muted>Loading price history…</AppText>;
  const chart = priceChart(read.history, {
    range,
    tick: detail.tick,
    price: detail.price,
    initialPrice: detail.asset.initialPrice,
    tickMs: getContent().economy.market.tickMs,
  });
  const text = chartRangeText(chart);
  return (
    <>
      <LineChart
        points={chart.points}
        trend={trendOf(chart.changeBps)}
        summary={`${detail.asset.name} price chart. ${text}`}
      />
      <AppText variant="caption" muted importantForAccessibility="no" accessibilityElementsHidden>
        {text}
      </AppText>
    </>
  );
}
