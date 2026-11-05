import { StyleSheet } from 'react-native';

import { FICTIONAL_NOTICE } from '@/content';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';
import { SegmentedControl, type SegmentOption } from '@/ui/SegmentedControl';
import { useSegment } from '@/ui/state/useSegment';
import { AppText } from '@/ui/Typography';

import { CoinRows } from './CoinRows';
import { StockRows } from './StockRows';

type Market = 'stocks' | 'crypto';

const MARKET_OPTIONS: readonly SegmentOption<Market>[] = [
  { value: 'stocks', label: 'Stocks' },
  { value: 'crypto', label: 'Crypto' },
];

export function MarketsScreen() {
  const market = useSegment<Market>('stocks');
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
      <Card>{market.selected === 'stocks' ? <StockRows /> : <CoinRows />}</Card>
      <AppText variant="caption" muted style={styles.notice}>
        {FICTIONAL_NOTICE}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: { textAlign: 'center' },
});
