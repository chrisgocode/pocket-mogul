import { freshGameState, type GameState } from '@/domain/gameState';
import { withCompletedGoals, type GoalRules } from '@/domain/goals';
import { dollars } from '@/domain/money';
import { applyTapBatch } from '@/domain/tapping';
import { DAY_MS, testCollection as economy } from '@/domain/testCollection';

import { applySellCollectible, applySetShowpiece } from './commands';
import { collectionProgress, perkPercent, saleReturnPercent } from './sets';

const held = (...pieceIds: string[]) =>
  pieceIds.map((pieceId) => ({ pieceId, acquiredDay: 0, paidCents: dollars('500') }));

const holding = (pieceIds: string[], change: Partial<GameState> = {}): GameState => ({
  ...freshGameState({ saveId: 'collector', economyVersion: 2, wallMs: 0 }),
  clock: { simulationMs: 5 * DAY_MS, lastWallCheckpointMs: 0 },
  collectibles: held(...pieceIds),
  ...change,
});

const tapRules = { baseCents: dollars('1'), perLevelCents: dollars('1') };

const goalRules: GoalRules = {
  instruments: [],
  collection: economy,
  goals: [
    { id: 'first_piece', kind: 'collection', measure: 'pieces', count: 1, reward: dollars('5') },
    { id: 'first_set', kind: 'collection', measure: 'sets', count: 1, reward: dollars('5') },
    {
      id: 'three_kinds',
      kind: 'collection',
      measure: 'categories',
      count: 3,
      reward: dollars('5'),
    },
  ],
};

const reached = (pieceIds: string[]) =>
  withCompletedGoals(holding(pieceIds), goalRules).completedGoalIds;

describe('sets and their perks (COL07)', () => {
  it('gives no perk until every piece of the set is held', () => {
    const tap = { economy, kind: 'tap' } as const;
    expect(perkPercent(held('sketch'), tap)).toBe(0);
    expect(perkPercent(held('sketch', 'meteorite'), tap)).toBe(5);
    expect(perkPercent(held('table_red', 'roadster'), tap)).toBe(0);
  });

  it('adds a finished resale set to what a sale pays', () => {
    expect(saleReturnPercent(held('table_red'), economy)).toBe(90);
    expect(saleReturnPercent(held('table_red', 'roadster'), economy)).toBe(94);
    const sale = applySellCollectible(holding(['table_red', 'roadster']), {
      pieceId: 'table_red',
      economy,
    });
    expect(sale).toMatchObject({ ok: true, cashChangeCents: dollars('517') });
  });

  it('adds a finished tap set to every tap, on top of a boost', () => {
    const batch = { taps: 7, rules: tapRules, multiplier: 2 };
    const bonusPercent = perkPercent(held('sketch', 'meteorite'), { economy, kind: 'tap' });
    expect(applyTapBatch(holding([]), batch).earnedCents).toBe(dollars('14'));
    expect(applyTapBatch(holding([]), { ...batch, bonusPercent }).earnedCents).toBe(
      dollars('14.70'),
    );
  });

  it('counts pieces, finished sets and categories', () => {
    const pieces = held('sketch', 'meteorite', 'table_red');
    const count = (measure: 'pieces' | 'sets' | 'categories') =>
      collectionProgress(pieces, { economy, measure });
    expect([count('pieces'), count('sets'), count('categories')]).toEqual([3, 1, 3]);
  });
});

describe('the showpiece (COL08)', () => {
  it('puts a held piece on show and takes it down again', () => {
    const shown = applySetShowpiece(holding(['sketch']), { pieceId: 'sketch' });
    expect(shown).toMatchObject({ ok: true, cashChangeCents: 0n, state: { showpiece: 'sketch' } });
    const state = holding(['sketch'], { showpiece: 'sketch' });
    expect(applySetShowpiece(state, { pieceId: null })).toMatchObject({
      state: { showpiece: null },
    });
  });

  it('refuses a piece the player does not hold', () => {
    expect(applySetShowpiece(holding([]), { pieceId: 'sketch' })).toEqual({
      ok: false,
      error: 'NOT_OWNED',
    });
  });

  it('comes down when the piece is sold, and stays up when another is sold', () => {
    const state = holding(['table_red', 'roadster'], { showpiece: 'table_red' });
    expect(applySellCollectible(state, { pieceId: 'table_red', economy })).toMatchObject({
      state: { showpiece: null },
    });
    expect(applySellCollectible(state, { pieceId: 'roadster', economy })).toMatchObject({
      state: { showpiece: 'table_red' },
    });
  });
});

describe('collection goals (COL09)', () => {
  it('reaches a goal for pieces, sets and categories held', () => {
    expect(reached([])).toEqual([]);
    expect(reached(['sketch'])).toEqual(['first_piece']);
    expect(reached(['sketch', 'meteorite'])).toEqual(['first_piece', 'first_set']);
    expect(reached(['sketch', 'table_red', 'roadster'])).toEqual([
      'first_piece',
      'first_set',
      'three_kinds',
    ]);
  });
});
