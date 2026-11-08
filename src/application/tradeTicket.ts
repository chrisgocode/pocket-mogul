import { availableListedShares } from '@/domain/business/listingTrades';
import type { Content } from '@/content';
import type { GameErrorCode } from '@/domain/commands';
import {
  dollars,
  moneyCents,
  quantityMicrounits,
  type MoneyCents,
  units,
  type QuantityMicrounits,
} from '@/domain/money';
import { largestQuantityWithin, type TradeQuote, type TradeSide } from '@/domain/tradeQuotes';
import { checkTrade, findInstrument, positionOf, tradePricing } from '@/domain/trades';

import { tradeEconomy } from './economy';
import type { GameSnapshot } from './game';

export type TradeEntryMode = 'quantity' | 'dollars';

export type TradeEntry = {
  readonly side: TradeSide;
  readonly mode: TradeEntryMode;
  readonly text: string;
};

export type TradeTicket =
  | { readonly status: 'empty'; readonly tick: number }
  | { readonly status: 'invalid'; readonly tick: number; readonly error: GameErrorCode }
  | {
      readonly status: 'refused';
      readonly tick: number;
      readonly error: GameErrorCode;
      readonly quote: TradeQuote;
    }
  | { readonly status: 'ready'; readonly tick: number; readonly quote: TradeQuote };

type TicketRequest = { readonly assetId: string; readonly content: Content };

const WHOLE_PERCENT = 100n;

function parsed<T>(read: () => T): T | undefined {
  try {
    return read();
  } catch {
    return undefined;
  }
}

export type EnteredOrder =
  | { readonly status: 'empty' }
  | { readonly status: 'invalid' }
  | { readonly status: 'quantity'; readonly quantity: QuantityMicrounits };

function quantityForAmount(
  snapshot: GameSnapshot,
  request: TicketRequest & { readonly side: TradeSide; readonly amount: MoneyCents },
): QuantityMicrounits | undefined {
  const economy = tradeEconomy(request.content, snapshot.state);
  const instrument = findInstrument(economy, request.assetId);
  if (instrument === undefined) return undefined;
  const { state } = snapshot;
  const pricing = tradePricing(state, { instrument, economy });
  const holding = positionOf(state, instrument.id).quantity;
  const cashCents = request.amount;
  const budget =
    request.side === 'buy'
      ? { side: 'buy' as const, cashCents }
      : { side: 'sell' as const, cashCents, holding };
  return largestQuantityWithin(budget, pricing);
}

function enteredQuantity(
  snapshot: GameSnapshot,
  request: TicketRequest & { readonly entry: TradeEntry },
): QuantityMicrounits | undefined {
  const { entry } = request;
  if (entry.mode === 'quantity') return parsed(() => units(entry.text));
  const amount = parsed(() => dollars(entry.text));
  if (amount === undefined || amount < 0n) return undefined;
  return quantityForAmount(snapshot, { ...request, side: entry.side, amount });
}

export function readEntry(
  snapshot: GameSnapshot,
  request: TicketRequest & { readonly entry: TradeEntry },
): EnteredOrder {
  if (request.entry.text.trim() === '') return { status: 'empty' };
  const quantity = enteredQuantity(snapshot, request);
  return quantity === undefined ? { status: 'invalid' } : { status: 'quantity', quantity };
}

export function selectTradeTicket(
  snapshot: GameSnapshot,
  request: TicketRequest & { readonly side: TradeSide; readonly order: EnteredOrder },
): TradeTicket {
  const { tick } = snapshot.state.market;
  const { order } = request;
  if (order.status === 'empty') return { status: 'empty', tick };
  if (order.status === 'invalid') return { status: 'invalid', tick, error: 'INVALID_QUANTITY' };
  const checked = checkTrade(snapshot.state, {
    assetId: request.assetId,
    side: request.side,
    quantity: order.quantity,
    economy: tradeEconomy(request.content, snapshot.state),
  });
  if (checked.ok) return { status: 'ready', tick, quote: checked.quote };
  if (checked.quote === undefined) return { status: 'invalid', tick, error: checked.error };
  return { status: 'refused', tick, error: checked.error, quote: checked.quote };
}

export function presetQuantity(
  snapshot: GameSnapshot,
  request: TicketRequest & { readonly side: TradeSide; readonly percent: number },
): QuantityMicrounits {
  const { state } = snapshot;
  const economy = tradeEconomy(request.content, snapshot.state);
  const instrument = findInstrument(economy, request.assetId);
  if (instrument === undefined) return quantityMicrounits(0);
  const share = (amount: bigint) => (amount * BigInt(request.percent)) / WHOLE_PERCENT;
  if (request.side === 'sell') {
    return quantityMicrounits(share(positionOf(state, instrument.id).quantity));
  }
  const affordable = largestQuantityWithin(
    { side: 'buy', cashCents: moneyCents(share(state.cashCents)) },
    tradePricing(state, { instrument, economy }),
  );
  const available = availableListedShares(state, request.assetId) ?? affordable;
  return quantityMicrounits(affordable < available ? affordable : available);
}
