import type { Content } from '@/content';
import type { GameErrorCode } from '@/domain/commands';
import {
  dollars,
  moneyCents,
  quantityMicrounits,
  units,
  type QuantityMicrounits,
} from '@/domain/money';
import { largestQuantityWithin, type TradeQuote, type TradeSide } from '@/domain/trading';
import { checkTrade, findInstrument, positionOf, tradePricing } from '@/domain/trades';

import { tradeEconomy } from './economy';
import type { GameSnapshot } from './game';

export type TradeEntryMode = 'shares' | 'dollars';

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

function enteredQuantity(
  snapshot: GameSnapshot,
  request: TicketRequest & { readonly entry: TradeEntry },
): QuantityMicrounits | undefined {
  const { entry } = request;
  if (entry.mode === 'shares') return parsed(() => units(entry.text));
  const amount = parsed(() => dollars(entry.text));
  if (amount === undefined || amount < 0n) return undefined;
  const economy = tradeEconomy(request.content);
  const instrument = findInstrument(economy, request.assetId);
  if (instrument === undefined) return undefined;
  const { state } = snapshot;
  const pricing = tradePricing(state, { instrument, economy });
  const holding = positionOf(state, instrument.id).quantity;
  const budget =
    entry.side === 'buy'
      ? { side: 'buy' as const, cashCents: amount }
      : { side: 'sell' as const, cashCents: amount, holding };
  return largestQuantityWithin(budget, pricing);
}

export function selectTradeTicket(
  snapshot: GameSnapshot,
  request: TicketRequest & { readonly entry: TradeEntry },
): TradeTicket {
  const { tick } = snapshot.state.market;
  if (request.entry.text.trim() === '') return { status: 'empty', tick };
  const quantity = enteredQuantity(snapshot, request);
  if (quantity === undefined) return { status: 'invalid', tick, error: 'INVALID_QUANTITY' };
  const checked = checkTrade(snapshot.state, {
    assetId: request.assetId,
    side: request.entry.side,
    quantity,
    economy: tradeEconomy(request.content),
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
  const economy = tradeEconomy(request.content);
  const instrument = findInstrument(economy, request.assetId);
  if (instrument === undefined) return quantityMicrounits(0);
  const share = (amount: bigint) => (amount * BigInt(request.percent)) / WHOLE_PERCENT;
  if (request.side === 'sell') {
    return quantityMicrounits(share(positionOf(state, instrument.id).quantity));
  }
  return largestQuantityWithin(
    { side: 'buy', cashCents: moneyCents(share(state.cashCents)) },
    tradePricing(state, { instrument, economy }),
  );
}
