import type { GameState } from './gameState';

export const GOAL_MEASURES = [
  'businesses',
  'rivals_merged',
  'listings',
  'properties',
  'rentals',
  'trades',
  'tax_returns',
  'wallet_level',
  'taps',
  'tiers',
] as const;

export type GoalMeasure = (typeof GOAL_MEASURES)[number];

function filedReturns(state: GameState): number {
  if (state.tax.status === 'notStarted') return 0;
  if (state.tax.status === 'exempt') return Number.MAX_SAFE_INTEGER;
  return state.tax.returns.filter((filed) => filed.filing.status !== 'unfiled').length;
}

const MEASURES: Readonly<Record<GoalMeasure, (state: GameState) => number>> = {
  businesses: (state) => state.businesses.length,
  rivals_merged: (state) =>
    state.businesses.reduce((total, business) => total + business.takeovers.merged.length, 0),
  listings: (state) =>
    state.businesses.filter((business) => business.listing.status === 'listed').length,
  properties: (state) => state.properties.length,
  rentals: (state) => state.properties.filter((property) => property.rented).length,
  trades: (state) => state.activity.lifetime.byKind.trade,
  tax_returns: filedReturns,
  wallet_level: (state) => state.tap.walletLevel,
  taps: (state) => state.tap.totalAcceptedTaps,
  tiers: (state) => state.unlockedTiers.length,
};

export function goalMeasure(state: GameState, measure: GoalMeasure): number {
  return MEASURES[measure](state);
}

export function businessStage(state: GameState, businessId: string): number {
  return state.businesses.find((business) => business.definitionId === businessId)?.stage ?? 0;
}
