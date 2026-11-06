import type { BusinessDefinition } from './businessQuotes';
import type { BusinessEconomy } from './businesses';
import { freshGameState, type GameState } from './gameState';
import { dollars, moneyCents } from './money';
import { settleOffline } from './offline';

const HOUR_MS = 3_600_000;
const CAP_MS = 8 * HOUR_MS;
const LEFT_AT_MS = 1_000_000;

const vending: BusinessDefinition = {
  id: 'vending',
  tier: 1,
  price: dollars('250'),
  revenuePerMinute: dollars('14'),
  costsPerMinute: dollars('4'),
};

const economy: BusinessEconomy = {
  catalog: [vending],
  rules: {
    maxTrackLevel: 20,
    upgradeWeightBps: { capacity: 2000, quality: 2500, efficiency: 1500 },
    upgradeGrowth: { numerator: 118, denominator: 100 },
    levelEffectPercent: {
      capacityRevenue: 10,
      qualityRevenue: 10,
      capacityCosts: 6,
      efficiencySaving: 2,
    },
    managerPriceMultiplier: 2,
    managerBonusBps: 1000,
    milestoneEveryLevels: 15,
    milestoneBonusBps: 1000,
    saleReturnPercent: 60,
    branchArtCapacityLevels: [5, 10, 15, 20],
  },
};

function leftWith(...definitions: BusinessDefinition[]): GameState {
  return {
    ...freshGameState({ saveId: 'away', economyVersion: 1, wallMs: LEFT_AT_MS }),
    businesses: definitions.map((definition) => ({
      definitionId: definition.id,
      levels: { capacity: 0, quality: 0, efficiency: 0 },
      managerOwned: false,
      capitalizedSpendCents: definition.price,
    })),
  };
}

const returnAfter = (state: GameState, awayMs: number) =>
  settleOffline(state, {
    wallMs: state.clock.lastWallCheckpointMs + awayMs,
    capMs: CAP_MS,
    economy,
  });

describe('settling an absence', () => {
  it('credits $4,800 for ten hours away with one base Vending Machine (AC09)', () => {
    const settled = returnAfter(leftWith(vending), 10 * HOUR_MS);
    expect<bigint>(settled.earnedCents).toBe(dollars('4800'));
    expect<bigint>(settled.state.cashCents).toBe(dollars('4800'));
    expect(settled.state.clock).toEqual({
      simulationMs: CAP_MS,
      lastWallCheckpointMs: LEFT_AT_MS + 10 * HOUR_MS,
    });
  });

  it('pays nothing more for a second immediate return (AC09)', () => {
    const first = returnAfter(leftWith(vending), 10 * HOUR_MS);
    const second = returnAfter(first.state, 0);
    expect<bigint>(second.earnedCents).toBe(dollars('0'));
    expect<bigint>(second.state.cashCents).toBe(dollars('4800'));
  });

  it('records time away, credited time and earnings by source in a pending summary (UX05)', () => {
    const settled = returnAfter(leftWith(vending), 10 * HOUR_MS);
    expect(settled.state.returnSummary).toEqual({
      status: 'pending',
      summary: {
        awayMs: 10 * HOUR_MS,
        creditedMs: CAP_MS,
        earnings: { businesses: dollars('4800') },
      },
    });
  });

  it('credits a short absence without asking to show a summary', () => {
    const settled = returnAfter(leftWith(vending), 30_000);
    expect<bigint>(settled.earnedCents).toBe(dollars('5'));
    expect(settled.state.returnSummary).toEqual({ status: 'none' });
  });

  it('shows no summary when nothing was earned', () => {
    const settled = returnAfter(leftWith(), 10 * HOUR_MS);
    expect(settled.state.returnSummary).toEqual({ status: 'none' });
  });

  it('adds a later absence to a summary the player has not dismissed yet', () => {
    const first = returnAfter(leftWith(vending), 2 * HOUR_MS);
    const second = returnAfter(first.state, 30_000);
    expect(second.state.returnSummary).toEqual({
      status: 'pending',
      summary: {
        awayMs: 2 * HOUR_MS + 30_000,
        creditedMs: 2 * HOUR_MS + 30_000,
        earnings: { businesses: dollars('1205') },
      },
    });
  });
});

describe('a wall clock that moved backward', () => {
  it('credits nothing, resets the wall baseline and reports it', () => {
    const settled = returnAfter(leftWith(vending), -HOUR_MS);
    expect<bigint>(settled.earnedCents).toBe(moneyCents(0));
    expect(settled.state.clock).toEqual({
      simulationMs: 0,
      lastWallCheckpointMs: LEFT_AT_MS - HOUR_MS,
    });
    expect(settled.clock).toEqual({
      direction: 'backward',
      checkpointWallMs: LEFT_AT_MS,
      observedWallMs: LEFT_AT_MS - HOUR_MS,
    });
  });

  it('reports a forward clock otherwise', () => {
    expect(returnAfter(leftWith(vending), HOUR_MS).clock).toEqual({ direction: 'forward' });
  });
});
