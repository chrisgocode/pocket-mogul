import { freshGameState, type GameState } from './gameState';
import { businessStage, goalMeasure } from './goalMeasures';
import { rankStanding } from './rank';
import { dollars } from './money';
import { ownedBusiness } from './testRules';

const fresh = freshGameState({ saveId: 'measures', economyVersion: 2, wallMs: 0 });

const LEVELS = { renovation: 0, furnishings: 0, systems: 0, expansion: 0 };

const cart = ownedBusiness('food_cart', { stage: 3 });

const state: GameState = {
  ...fresh,
  unlockedTiers: [1, 2],
  tap: { walletLevel: 7, totalAcceptedTaps: 42 },
  businesses: [
    { ...cart, takeovers: { ...cart.takeovers, merged: ['rival_a', 'rival_b'] } },
    ownedBusiness('vending'),
  ],
  properties: [
    { definitionId: 'studio', levels: LEVELS, rented: true, upgradeSpendCents: dollars('0') },
    { definitionId: 'house', levels: LEVELS, rented: false, upgradeSpendCents: dollars('0') },
  ],
};

describe('goal measures (UX03)', () => {
  it('counts what the player owns and has done', () => {
    const counts = (
      ['businesses', 'rivals_merged', 'listings', 'properties', 'rentals', 'trades'] as const
    ).map((measure) => goalMeasure(state, measure));
    expect(counts).toEqual([2, 2, 0, 2, 1, 0]);
    expect(
      (['wallet_level', 'taps', 'tiers'] as const).map((measure) => goalMeasure(state, measure)),
    ).toEqual([7, 42, 2]);
  });

  it('reads the stage of an owned business, and zero for one not owned', () => {
    expect(businessStage(state, 'food_cart')).toBe(3);
    expect(businessStage(state, 'airline')).toBe(0);
  });

  it('counts no tax returns before taxes start', () => {
    expect(goalMeasure(state, 'tax_returns')).toBe(0);
  });
});

const RANKS = [
  { id: 'a', title: 'A', threshold: dollars('0') },
  { id: 'b', title: 'B', threshold: dollars('100') },
];

describe('rank (UX03)', () => {
  it('holds the highest rank whose threshold the peak has reached', () => {
    expect(rankStanding(dollars('99.99'), RANKS)).toEqual({ current: RANKS[0], next: RANKS[1] });
    expect(rankStanding(dollars('100'), RANKS)).toEqual({ current: RANKS[1], next: undefined });
    expect(rankStanding(dollars('100'), [])).toBeUndefined();
  });
});
