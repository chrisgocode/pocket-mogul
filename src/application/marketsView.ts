import type { Coin, Content, Stock } from '@/content';
import { quoteOf, type MarketState, type Ohlc } from '@/domain/market';
import { changeBps } from '@/domain/marketPrices';
import type { PriceMicros } from '@/domain/money';

import type { GameSnapshot } from './game';
import { selectPosition, type PositionView } from './positionView';

type Quoted = {
  readonly price: PriceMicros;
  readonly hourChangeBps: number;
  readonly candle: Ohlc | undefined;
};

export type StockQuote = Quoted & { readonly kind: 'stock'; readonly asset: Stock };
export type CoinQuote = Quoted & { readonly kind: 'coin'; readonly asset: Coin };
export type AssetQuote = StockQuote | CoinQuote;
export type AssetKind = AssetQuote['kind'];

export type AssetDetail =
  | { readonly status: 'unknown' }
  | (AssetQuote & {
      readonly status: 'listed';
      readonly tick: number;
      readonly trading: 'open' | 'locked';
      readonly watched: boolean;
      readonly position: PositionView | undefined;
    });

function quoted(market: MarketState, asset: Stock | Coin): Quoted {
  const price = quoteOf(market, asset);
  const candle = market.candles[asset.id];
  return { price, candle, hourChangeBps: changeBps(candle?.open ?? price, price) };
}

export function selectStockQuotes(snapshot: GameSnapshot, content: Content): StockQuote[] {
  const { market } = snapshot.state;
  return content.stocks.map((asset) => ({ kind: 'stock', asset, ...quoted(market, asset) }));
}

export function selectCoinQuotes(snapshot: GameSnapshot, content: Content): CoinQuote[] {
  const { market } = snapshot.state;
  return content.coins.map((asset) => ({ kind: 'coin', asset, ...quoted(market, asset) }));
}

export function selectAssetDetail(
  snapshot: GameSnapshot,
  request: { assetId: string; content: Content },
): AssetDetail {
  const quotes: readonly AssetQuote[] = [
    ...selectStockQuotes(snapshot, request.content),
    ...selectCoinQuotes(snapshot, request.content),
  ];
  const found = quotes.find((quote) => quote.asset.id === request.assetId);
  if (found === undefined) return { status: 'unknown' };
  const { state } = snapshot;
  return {
    ...found,
    status: 'listed',
    tick: state.market.tick,
    trading: state.tradingUnlocked ? 'open' : 'locked',
    watched: state.watchlist.includes(request.assetId),
    position: selectPosition(state, request),
  };
}

export function selectWatchedQuotes(
  snapshot: GameSnapshot,
  quotes: readonly AssetQuote[],
): AssetQuote[] {
  const { watchlist } = snapshot.state;
  return quotes.filter((quote) => watchlist.includes(quote.asset.id));
}
