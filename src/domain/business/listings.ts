import type { GameState } from '@/domain/gameState';
import type { MarketInstrument } from '@/domain/market';
import { moneyCents, priceMicros, type MoneyCents, type PriceMicros } from '@/domain/money';
import { drawInt } from '@/domain/marketRandom';
import { markPosition, quoteTrade } from '@/domain/tradeQuotes';

import { findBusiness, type BusinessEconomy } from './definition';
import { listingId, TOTAL_SHARES } from './listingState';
import type { OwnedBusiness } from './owned';
import { valuationCents } from './valuation';

const MICROS_PER_CENT = 10_000n;
const QUANTITY_SCALE = 1_000_000n;
const BASIS_POINTS = 10_000n;
const NOISE_LIMIT = 100;

export function listingPrice(
  value: MoneyCents,
  key: { seed: string; tick: number; businessId: string },
): PriceMicros {
  const noise = drawInt({ ...key, scope: key.businessId, stream: 'listing' }, [
    -NOISE_LIMIT,
    NOISE_LIMIT,
  ]);
  const base = (value * MICROS_PER_CENT * QUANTITY_SCALE) / TOTAL_SHARES;
  const price = (base * (BASIS_POINTS + BigInt(noise))) / BASIS_POINTS;
  return priceMicros(price > 0n ? price : 1n);
}

export function listingInstruments(state: GameState, economy: BusinessEconomy): MarketInstrument[] {
  return state.businesses.flatMap((business) => {
    if (business.listing.status === 'private') return [];
    const definition = findBusiness(economy.catalog, business.definitionId);
    if (definition === undefined) return [];
    const listingValueCents = valuationCents(business, { definition, rules: economy.rules });
    return [
      {
        id: listingId(business.definitionId),
        market: 'stocks',
        sector: undefined,
        initialPrice: listingPrice(listingValueCents, {
          ...state.market,
          businessId: business.definitionId,
        }),
        assetShockBps: 0,
        listingValueCents,
        businessId: business.definitionId,
      },
    ];
  });
}

export function listedSaleCents(
  business: OwnedBusiness,
  state: GameState,
  feeBps = 0,
): MoneyCents | undefined {
  if (business.listing.status === 'private') return undefined;
  const price = state.market.quotes[listingId(business.definitionId)];
  const position = state.positions.find(
    (held) => held.instrumentId === listingId(business.definitionId),
  );
  if (price === undefined || position === undefined) return undefined;
  if (state.economyVersion > 1)
    return quoteTrade({ side: 'sell', quantity: position.quantity }, { price, feeBps })
      .cashChangeCents;
  return moneyCents(
    markPosition(position, price).valueCents +
      (business.treasuryCents * business.listing.sharesHeld) / TOTAL_SHARES,
  );
}
