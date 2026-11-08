import { StyleSheet } from 'react-native';
import {
  selectCoinQuotes,
  selectStockQuotes,
  selectWatchedQuotes,
} from '@/application/marketsView';
import { FICTIONAL_NOTICE, getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { PageTitle } from '@/ui/PageTitle';
import { Screen } from '@/ui/Screen';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { useSegment } from '@/ui/state/useSegment';
import { AppText } from '@/ui/Typography';
import { MarketExplore } from './MarketExplore';
import { MarketPortfolio } from './MarketPortfolio';
import { AssetQuoteRow } from './AssetQuoteRow';
const MODES = ['Portfolio', 'Explore', 'Watchlist'] as const;
export function MarketsScreen() {
  const snapshot = useGameSnapshot();
  const content = getContent();
  const mode = useSegment<string>(snapshot.state.positions.length > 0 ? 'Portfolio' : 'Explore');
  const quotes = [...selectStockQuotes(snapshot, content), ...selectCoinQuotes(snapshot, content)];
  const watched = selectWatchedQuotes(snapshot, quotes);
  return (
    <Screen tone="markets">
      <PageTitle title="Markets" />
      <SegmentedControl
        options={MODES.map((label) => ({ value: label, label }))}
        selected={mode.selected}
        onSelect={mode.select}
      />
      {snapshot.state.tradingUnlocked ? null : (
        <AppText variant="caption" muted>
          Trading unlocks with your first business.
        </AppText>
      )}
      {mode.selected === 'Portfolio' ? <MarketPortfolio quotes={quotes} /> : null}
      {mode.selected === 'Explore' ? <MarketExplore quotes={quotes} /> : null}
      {mode.selected === 'Watchlist'
        ? watched.map((quote) => <AssetQuoteRow key={quote.asset.id} quote={quote} />)
        : null}
      {mode.selected === 'Watchlist' && watched.length === 0 ? (
        <AppText muted>No watched assets</AppText>
      ) : null}
      <AppText variant="caption" muted style={styles.notice}>
        {FICTIONAL_NOTICE}
      </AppText>
    </Screen>
  );
}
const styles = StyleSheet.create({ notice: { textAlign: 'center' } });
