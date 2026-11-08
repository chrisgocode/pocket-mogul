import type { CommandResult } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';
import type { OwnedBusiness } from './owned';
import { moneyCents, quantityMicrounits, type QuantityMicrounits } from '@/domain/money';
import { changed, lookUpOwned, type BusinessOrder } from './commands';
import {
  FLOAT_PERCENTS,
  LISTING_STAGE,
  LISTING_READER_VERSION,
  listingId,
  SHARE_PERCENT,
  TOTAL_SHARES,
} from './listingState';
import { listingPrice } from './listings';
import { valuationCents } from './valuation';

export function applyGoPublic(
  state: GameState,
  order: BusinessOrder & {
    readonly floatPercent: number;
    readonly ticker: string;
    readonly reservedTickers: readonly string[];
  },
): CommandResult {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  if (found.owned.stage < LISTING_STAGE) return { ok: false, error: 'STAGE_LOCKED' };
  if (found.owned.listing.status === 'listed') return { ok: false, error: 'ALREADY_OWNED' };
  if (found.owned.status === 'closed') return { ok: false, error: 'BUSINESS_CLOSED' };
  if (
    !FLOAT_PERCENTS.some((percent) => percent === order.floatPercent) ||
    !/^[A-Z]{3,5}$/.test(order.ticker) ||
    order.reservedTickers.includes(order.ticker)
  ) {
    return { ok: false, error: 'INVALID_QUANTITY' };
  }
  return listed(state, { ...order, found });
}

function listed(
  state: GameState,
  order: {
    readonly floatPercent: number;
    readonly ticker: string;
    readonly found: Extract<ReturnType<typeof lookUpOwned>, { ok: true }>;
  },
): CommandResult {
  const { owned, pricing } = order.found;
  const value = valuationCents(owned, pricing);
  const proceeds = (value * BigInt(order.floatPercent)) / 100n;
  const sharesHeld = quantityMicrounits(TOTAL_SHARES - BigInt(order.floatPercent) * SHARE_PERCENT);
  const listing = {
    status: 'listed' as const,
    ticker: order.ticker,
    sharesHeld,
  };
  const updated = changed(state, {
    ...owned,
    treasuryCents: moneyCents(owned.treasuryCents + proceeds),
    listing,
  });
  if (!updated.ok) return updated;
  const id = listingId(owned.definitionId);
  const price = listingPrice(moneyCents(value + proceeds), {
    ...state.market,
    businessId: owned.definitionId,
  });
  return {
    ...updated,
    state: {
      ...updated.state,
      minReaderVersion: LISTING_READER_VERSION,
      market: { ...state.market, quotes: { ...state.market.quotes, [id]: price } },
      positions: [...state.positions, retainedPosition({ owned, sharesHeld, id })],
    },
  };
}

function retainedPosition({
  owned,
  sharesHeld,
  id,
}: {
  owned: OwnedBusiness;
  sharesHeld: QuantityMicrounits;
  id: string;
}) {
  return {
    instrumentId: id,
    quantity: sharesHeld,
    remainingBasisCents: moneyCents((owned.capitalizedSpendCents * sharesHeld) / TOTAL_SHARES),
    realizedProfitCents: moneyCents(0),
  };
}
