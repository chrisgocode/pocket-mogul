import type { Content, Stock } from '@/content';
import type { GameState } from '@/domain/gameState';
import { listingId } from '@/domain/business/listingState';
import { listingInstruments } from '@/domain/business/listings';
import { moneyCents } from '@/domain/money';

import { businessEconomy } from './economy';

export function listedStocks(state: GameState, content: Content): Stock[] {
  const instruments = listingInstruments(state, businessEconomy(content));
  return state.businesses.flatMap((owned) => {
    if (owned.listing.status === 'private') return [];
    const business = content.businesses.find((definition) => definition.id === owned.definitionId);
    const instrument = instruments.find((each) => each.id === listingId(owned.definitionId));
    if (business === undefined || instrument === undefined) return [];
    return [
      {
        id: instrument.id,
        ticker: owned.listing.ticker,
        name: business.name,
        sector: 'industrials',
        volatilityClass: 'standard',
        initialPrice: instrument.initialPrice,
        dividendCentsPerSharePerHour: moneyCents(0),
        logo: business.logo,
        description:
          'Your listed business. Shareholders receive their share of business payouts. Buy back every outside share to delist.',
      },
    ];
  });
}
