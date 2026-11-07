import { freshGameState, type GameState } from './gameState';
import { dollars, moneyCents } from './money';
import { settleOffline } from './offline';
import type { PassiveEconomy } from './passiveIncome';
import { businessRules, ownedBusiness, propertyRules, vendingDefinition } from './testRules';

const HOUR_MS = 3_600_000;
const CAP_MS = 8 * HOUR_MS;
const LEFT_AT_MS = 1_000_000;

const leaky = { ...vendingDefinition, id: 'leaky', upkeepPerUnitCents: dollars('132') };

const economy: PassiveEconomy = {
  businesses: { catalog: [vendingDefinition, leaky], rules: businessRules },
  properties: { catalog: [], rules: propertyRules },
  dividendRates: {},
};

function leftWith(...businessIds: string[]): GameState {
  return {
    ...freshGameState({ saveId: 'away', economyVersion: 1, wallMs: LEFT_AT_MS }),
    businesses: businessIds.map((businessId) => ownedBusiness(businessId)),
  };
}

const noEarnings = { businesses: dollars('0'), rent: dollars('0'), dividends: dollars('0') };

const returnAfter = (state: GameState, awayMs: number) =>
  settleOffline(state, {
    wallMs: state.clock.lastWallCheckpointMs + awayMs,
    capMs: CAP_MS,
    economy,
  });

describe('settling an absence', () => {
  it('settles $4,800 over 48 business days for ten hours away: $2,400 cash, $2,400 treasury (AC09)', () => {
    const settled = returnAfter(leftWith('vending'), 10 * HOUR_MS);
    expect<bigint>(settled.earnedCents).toBe(dollars('2400'));
    expect<bigint>(settled.state.cashCents).toBe(dollars('2400'));
    expect(settled.state.businesses[0]?.treasuryCents).toBe(dollars('2400'));
    expect(settled.state.clock).toEqual({
      simulationMs: CAP_MS,
      lastWallCheckpointMs: LEFT_AT_MS + 10 * HOUR_MS,
    });
  });

  it('pays nothing more for a second immediate return (AC09)', () => {
    const first = returnAfter(leftWith('vending'), 10 * HOUR_MS);
    const second = returnAfter(first.state, 0);
    expect<bigint>(second.earnedCents).toBe(dollars('0'));
    expect<bigint>(second.state.cashCents).toBe(dollars('2400'));
  });

  it('records time away, credited time and earnings by source in a pending summary (UX05)', () => {
    const settled = returnAfter(leftWith('vending'), 10 * HOUR_MS);
    expect(settled.state.returnSummary).toEqual({
      status: 'pending',
      summary: {
        awayMs: 10 * HOUR_MS,
        creditedMs: CAP_MS,
        earnings: { ...noEarnings, businesses: dollars('2400') },
        closures: [],
      },
    });
  });

  it('credits a short absence without asking to show a summary', () => {
    const settled = returnAfter(leftWith('vending'), 30_000);
    expect<bigint>(settled.earnedCents).toBe(dollars('2.50'));
    expect(settled.state.returnSummary).toEqual({ status: 'none' });
  });

  it('shows no summary when nothing was earned', () => {
    const settled = returnAfter(leftWith(), 10 * HOUR_MS);
    expect(settled.state.returnSummary).toEqual({ status: 'none' });
  });

  it('adds a later absence to a summary the player has not dismissed yet', () => {
    const first = returnAfter(leftWith('vending'), 2 * HOUR_MS);
    const second = returnAfter(first.state, 30_000);
    expect(second.state.returnSummary).toEqual({
      status: 'pending',
      summary: {
        awayMs: 2 * HOUR_MS + 30_000,
        creditedMs: 2 * HOUR_MS + 30_000,
        earnings: { ...noEarnings, businesses: dollars('602.50') },
        closures: [],
      },
    });
  });
});

describe('a business that closes while the player is away (BUS12)', () => {
  it('lists the closure in the return summary even when nothing was earned', () => {
    const settled = returnAfter(leftWith('leaky'), 10 * HOUR_MS);
    expect(settled.closures).toEqual([{ businessId: 'leaky', atMs: 0 }]);
    expect(settled.state.returnSummary).toEqual({
      status: 'pending',
      summary: {
        awayMs: 10 * HOUR_MS,
        creditedMs: CAP_MS,
        earnings: noEarnings,
        closures: ['leaky'],
      },
    });
  });
});

describe('a wall clock that moved backward', () => {
  it('credits nothing, resets the wall baseline and reports it', () => {
    const settled = returnAfter(leftWith('vending'), -HOUR_MS);
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
    expect(returnAfter(leftWith('vending'), HOUR_MS).clock).toEqual({ direction: 'forward' });
  });
});
