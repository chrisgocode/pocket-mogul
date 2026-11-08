import type { GameState } from '@/domain/gameState';
import { quantityMicrounits } from '@/domain/money';
import { listingId, TOTAL_SHARES } from './listingState';

export function availableListedShares(state: GameState, assetId: string): bigint | undefined {
  const owned = state.businesses.find((business) => listingId(business.definitionId) === assetId);
  return owned?.listing.status === 'listed' ? TOTAL_SHARES - owned.listing.sharesHeld : undefined;
}

export function withTradedListing(state: GameState, assetId: string): GameState {
  if (availableListedShares(state, assetId) === undefined) return state;
  const position = state.positions.find((held) => held.instrumentId === assetId);
  if (position === undefined) return state;
  const delisting = position.quantity === TOTAL_SHARES;
  return {
    ...state,
    businesses: state.businesses.map((owned) => {
      if (listingId(owned.definitionId) !== assetId || owned.listing.status === 'private')
        return owned;
      return {
        ...owned,
        listing: delisting
          ? { status: 'private' }
          : {
              ...owned.listing,
              sharesHeld: quantityMicrounits(position.quantity),
            },
      };
    }),
    positions: delisting
      ? state.positions.filter((held) => held.instrumentId !== assetId)
      : state.positions,
    watchlist: delisting ? state.watchlist.filter((id) => id !== assetId) : state.watchlist,
  };
}
