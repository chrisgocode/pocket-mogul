import { DatabaseSync } from 'node:sqlite';

import { freshGameState } from '@/domain/gameState';
import { dollars, formatMoneyExact, moneyCents } from '@/domain/money';
import { nodeSqliteDriver } from '@/infrastructure/nodeSqliteDriver';
import { openSqlSaveStore } from '@/infrastructure/sqlSaveStore';

import { startTestGame } from './testGame';

describe('a fresh save', () => {
  it('starts with $0, wallet level 0, no assets and Tier 1 available (AC01)', async () => {
    const { game } = await startTestGame();
    const { state } = game.getSnapshot();
    expect<bigint>(state.cashCents).toBe(dollars('0'));
    expect(state.tap.walletLevel).toBe(0);
    expect(state.businesses).toEqual([]);
    expect(state.properties).toEqual([]);
    expect(state.unlockedTiers).toEqual([1]);
  });
});

describe('tapping', () => {
  it('commits exactly $10 for ten unboosted level-0 taps (AC02)', async () => {
    const { game } = await startTestGame();
    const result = await game.dispatch({ id: 'batch-1', command: { type: 'TapBatch', taps: 10 } });
    expect(result).toEqual({ ok: true, revision: 1, earnedCents: dollars('10') });
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('10'));
  });

  it('keeps committed cash across a restart over the same database', async () => {
    const first = await startTestGame();
    await first.game.dispatch({ id: 'batch-1', command: { type: 'TapBatch', taps: 3 } });
    const { game } = await first.restart();
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('3'));
    expect(game.getSnapshot().state.tap.totalAcceptedTaps).toBe(3);
  });

  it.each([0, -1, 1.5])('rejects a batch of %p taps', async (taps) => {
    const { game } = await startTestGame();
    const outcome = await game.dispatch({ id: 'bad', command: { type: 'TapBatch', taps } });
    expect(outcome).toEqual({ ok: false, error: 'INVALID_QUANTITY' });
    expect(game.getSnapshot().state.revision).toBe(0);
  });
});

describe('command receipts', () => {
  const tenTaps = { id: 'batch-1', command: { type: 'TapBatch', taps: 10 } } as const;

  it('returns the recorded result for a repeated command ID without paying again (AC04)', async () => {
    const { game } = await startTestGame();
    const first = await game.dispatch(tenTaps);
    const repeat = await game.dispatch(tenTaps);
    expect(repeat).toEqual(first);
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('10'));
    expect(game.getSnapshot().state.revision).toBe(1);
  });

  it('still recognises the command ID after a restart (AC04)', async () => {
    const first = await startTestGame();
    const recorded = await first.game.dispatch(tenTaps);
    const { game } = await first.restart();
    expect(await game.dispatch(tenTaps)).toEqual(recorded);
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('10'));
  });

  it('treats repeats that arrive together as one command (AC04)', async () => {
    const { game } = await startTestGame();
    const outcomes = await Promise.all([game.dispatch(tenTaps), game.dispatch(tenTaps)]);
    expect(outcomes[1]).toEqual(outcomes[0]);
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('10'));
  });
});

describe('a failed save', () => {
  const fiveTaps = { id: 'batch-1', command: { type: 'TapBatch', taps: 5 } } as const;

  it('reports SAVE_FAILED and keeps the committed snapshot', async () => {
    const { game, faults } = await startTestGame();
    faults.failWrites = true;
    expect(await game.dispatch(fiveTaps)).toEqual({ ok: false, error: 'SAVE_FAILED' });
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('0'));
    expect(game.getSnapshot().state.revision).toBe(0);
  });

  it('lets the same command succeed once saving works again', async () => {
    const { game, faults, restart } = await startTestGame();
    faults.failWrites = true;
    await game.dispatch(fiveTaps);
    faults.failWrites = false;
    expect(await game.dispatch(fiveTaps)).toEqual({
      ok: true,
      revision: 1,
      earnedCents: dollars('5'),
    });
    const restarted = await restart();
    expect<bigint>(restarted.game.getSnapshot().state.cashCents).toBe(dollars('5'));
  });
});

describe('very large money values', () => {
  it('taps, saves and reloads cash beyond Number precision exactly (AC24)', async () => {
    const database = new DatabaseSync(':memory:');
    const store = await openSqlSaveStore(nodeSqliteDriver(database));
    const fortune = moneyCents(2n ** 80n);
    const saved = {
      ...freshGameState({ saveId: 'rich', economyVersion: 1, wallMs: 0 }),
      cashCents: fortune,
    };
    await store.transact((tx) => tx.writeState(saved));

    const first = await startTestGame({ database, createId: () => 'only-id' });
    await first.game.dispatch({ id: 'batch-1', command: { type: 'TapBatch', taps: 1 } });
    const { game } = await first.restart();
    expect(formatMoneyExact(game.getSnapshot().state.cashCents)).toBe(
      '$12,089,258,196,146,291,747,062.76',
    );
  });
});
