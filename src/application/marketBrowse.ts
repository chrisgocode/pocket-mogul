import type { AssetQuote } from './marketsView';
export type MarketBrowse = { market: string; search: string; sort: string };
function before(a: AssetQuote, b: AssetQuote, sort: string): boolean {
  if (sort === 'Change') return a.hourChangeBps > b.hourChangeBps;
  if (sort === 'Price') return a.price > b.price;
  return a.asset.name.localeCompare(b.asset.name) < 0;
}
function inserted(
  sorted: readonly AssetQuote[],
  request: { quote: AssetQuote; sort: string },
): readonly AssetQuote[] {
  const index = sorted.findIndex((other) => before(request.quote, other, request.sort));
  if (index < 0) return [...sorted, request.quote];
  return [...sorted.slice(0, index), request.quote, ...sorted.slice(index)];
}
export function browseMarketQuotes(
  quotes: readonly AssetQuote[],
  request: MarketBrowse,
): readonly AssetQuote[] {
  const search = request.search.toLowerCase().trim();
  const filtered = quotes.filter(
    (quote) =>
      (request.market === 'Stocks' ? quote.kind === 'stock' : quote.kind === 'coin') &&
      `${quote.asset.name} ${quote.asset.ticker}`.toLowerCase().includes(search),
  );
  return filtered.reduce<readonly AssetQuote[]>(
    (sorted, quote) => inserted(sorted, { quote, sort: request.sort }),
    [],
  );
}
