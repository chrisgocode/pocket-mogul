import { browseMarketQuotes } from '@/application/marketBrowse';
import type { AssetQuote } from '@/application/marketsView';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { useSegment } from '@/ui/state/useSegment';
import { TextField } from '@/ui/TextField';
import { AssetQuoteRow } from './AssetQuoteRow';
import { MarketNews } from './MarketNews';
import { AppText } from '@/ui/Typography';
const MARKETS = ['Stocks', 'Crypto'] as const;
const SORTS = ['Name', 'Change', 'Price'] as const;
export function MarketExplore({ quotes }: { quotes: readonly AssetQuote[] }) {
  const market = useSegment<string>('Stocks');
  const search = useSegment<string>('');
  const sort = useSegment<string>('Name');
  const visible = browseMarketQuotes(quotes, {
    market: market.selected,
    search: search.selected,
    sort: sort.selected,
  });
  return (
    <>
      <SegmentedControl
        options={MARKETS.map((label) => ({ value: label, label }))}
        selected={market.selected}
        onSelect={market.select}
      />
      <TextField
        label="Search markets"
        value={search.selected}
        onChangeText={search.select}
        placeholder="Name or ticker"
        keyboardType="default"
      />
      <SegmentedControl
        options={SORTS.map((label) => ({ value: label, label }))}
        selected={sort.selected}
        onSelect={sort.select}
      />
      <AppText variant="caption" muted>
        Price / change this market hour
      </AppText>
      {visible.map((quote) => (
        <AssetQuoteRow key={quote.asset.id} quote={quote} />
      ))}
      {visible.length === 0 ? <AppText muted>No matching assets</AppText> : null}
      <MarketNews market={market.selected === 'Stocks' ? 'stocks' : 'crypto'} />
    </>
  );
}
