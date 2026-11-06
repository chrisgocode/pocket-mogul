import type { CommandResult, GameErrorCode } from './commands';
import type { GameState } from './gameState';
import { quoteOf } from './market';
import type { MarketInstrument, MarketKind } from './marketRules';
import { moneyCents, type MoneyCents, type QuantityMicrounits } from './money';
import {
  emptyPosition,
  quoteTrade,
  settleTrade,
  type Position,
  type TradePricing,
  type TradeQuote,
  type TradeSide,
} from './tradeQuotes';

export type TradeEconomy = {
  readonly instruments: readonly MarketInstrument[];
  readonly feeBps: Readonly<Record<MarketKind, number>>;
  readonly minTradeNotionalCents: MoneyCents;
};

export type TradeRequest = {
  readonly assetId: string;
  readonly side: TradeSide;
  readonly quantity: QuantityMicrounits;
};

export type TradeCheck =
  | { readonly ok: true; readonly quote: TradeQuote; readonly position: Position }
  | { readonly ok: false; readonly error: GameErrorCode; readonly quote?: TradeQuote };

export function findInstrument(
  economy: TradeEconomy,
  assetId: string,
): MarketInstrument | undefined {
  return economy.instruments.find((instrument) => instrument.id === assetId);
}

export function positionOf(state: GameState, instrumentId: string): Position {
  return (
    state.positions.find((held) => held.instrumentId === instrumentId) ??
    emptyPosition(instrumentId)
  );
}

export function tradePricing(
  state: GameState,
  context: { instrument: MarketInstrument; economy: TradeEconomy },
): TradePricing {
  return {
    price: quoteOf(state.market, context.instrument),
    feeBps: context.economy.feeBps[context.instrument.market],
  };
}

function refusal(quote: TradeQuote, position: Position, economy: TradeEconomy) {
  const clearsPosition = quote.side === 'sell' && quote.quantity === position.quantity;
  if (quote.side === 'sell' && quote.quantity > position.quantity) return 'INSUFFICIENT_HOLDING';
  if (quote.notionalCents < economy.minTradeNotionalCents && !clearsPosition)
    return 'BELOW_MINIMUM';
  return undefined;
}

export function checkTrade(
  state: GameState,
  order: TradeRequest & { readonly economy: TradeEconomy },
): TradeCheck {
  const instrument = findInstrument(order.economy, order.assetId);
  if (instrument === undefined) return { ok: false, error: 'UNKNOWN_ASSET' };
  if (order.quantity <= 0n) return { ok: false, error: 'INVALID_QUANTITY' };
  const quote = quoteTrade(order, tradePricing(state, { instrument, economy: order.economy }));
  const position = positionOf(state, instrument.id);
  const error = refusal(quote, position, order.economy);
  if (error !== undefined) return { ok: false, error, quote };
  if (state.cashCents + quote.cashChangeCents < 0n) {
    return { ok: false, error: 'INSUFFICIENT_CASH', quote };
  }
  return { ok: true, quote, position };
}

function withPosition(state: GameState, position: Position): readonly Position[] {
  const others = state.positions.filter((held) => held.instrumentId !== position.instrumentId);
  return [...others, position];
}

export function applyExecuteTrade(
  state: GameState,
  order: TradeRequest & { readonly quotedTick: number; readonly economy: TradeEconomy },
): CommandResult {
  if (!state.tradingUnlocked) return { ok: false, error: 'TRADING_LOCKED' };
  if (order.quotedTick !== state.market.tick) return { ok: false, error: 'STALE_QUOTE' };
  const checked = checkTrade(state, order);
  if (!checked.ok) return { ok: false, error: checked.error };
  const { quote } = checked;
  return {
    ok: true,
    cashChangeCents: quote.cashChangeCents,
    state: {
      ...state,
      cashCents: moneyCents(state.cashCents + quote.cashChangeCents),
      positions: withPosition(state, settleTrade(checked.position, quote)),
    },
  };
}

export function applySetWatchlist(
  state: GameState,
  order: { readonly assetId: string; readonly watched: boolean; readonly economy: TradeEconomy },
): CommandResult {
  if (findInstrument(order.economy, order.assetId) === undefined) {
    return { ok: false, error: 'UNKNOWN_ASSET' };
  }
  const others = state.watchlist.filter((assetId) => assetId !== order.assetId);
  const watchlist = order.watched ? [...others, order.assetId] : others;
  return { ok: true, cashChangeCents: moneyCents(0), state: { ...state, watchlist } };
}
