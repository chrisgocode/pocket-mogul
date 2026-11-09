import type { Content } from '@/content';
import { listingId } from '@/domain/business/listingState';
import { moneyCents } from '@/domain/money';
import type { GameSnapshot } from './game';
import { selectPortfolio } from './portfolioView';
export function selectBusinessWorth(snapshot: GameSnapshot, content: Content) {
  const portfolio = selectPortfolio(snapshot, content);
  const listedIds = new Set(
    snapshot.state.businesses
      .filter((business) => business.listing.status === 'listed')
      .map((business) => listingId(business.definitionId)),
  );
  const listedValue = portfolio.holdings.positions
    .filter((position) => listedIds.has(position.id))
    .reduce((sum, position) => sum + position.valueCents, 0n);
  return moneyCents(portfolio.worth.businessesCents + listedValue);
}
