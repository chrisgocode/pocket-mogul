import { StyleSheet } from 'react-native';

import { selectMarketNews } from '@/application/marketNews';
import { selectCoinQuotes, selectStockQuotes } from '@/application/marketsView';
import { FICTIONAL_NOTICE, getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';
import { Section } from '@/ui/Section';
import { SegmentedControl, type SegmentOption } from '@/ui/SegmentedControl';
import { useSegment } from '@/ui/state/useSegment';
import { AppText } from '@/ui/Typography';

import { AssetQuoteRow } from './AssetQuoteRow';
import { NewsList } from './NewsList';

type Market = 'stocks' | 'crypto';

const MARKET_OPTIONS: readonly SegmentOption<Market>[] = [
  { value: 'stocks', label: 'Stocks' },
  { value: 'crypto', label: 'Crypto' },
];

const NEWS_ITEMS = 4;

export function MarketsScreen() {
  const market = useSegment<Market>('stocks');
  const snapshot = useGameSnapshot();
  const content = getContent();
  const quotes =
    market.selected === 'stocks'
      ? selectStockQuotes(snapshot, content)
      : selectCoinQuotes(snapshot, content);
  const news = selectMarketNews(snapshot.state, {
    market: market.selected,
    content,
    limit: NEWS_ITEMS,
  });
  return (
    <Screen>
      <SegmentedControl
        options={MARKET_OPTIONS}
        selected={market.selected}
        onSelect={market.select}
      />
      <EmptyState
        title="Look around first"
        message="Markets become tradable after you buy your first business."
      />
      <Section title="Prices" note="Change this market hour">
        <Card>
          {quotes.map((quote) => (
            <AssetQuoteRow key={quote.asset.id} quote={quote} />
          ))}
        </Card>
      </Section>
      <Section title="Market news" note="What moved prices, not what happens next">
        <NewsList items={news} empty="No market news yet." />
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
