import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';

import { deferred, startTestGame, startTestGameFrom, type TestGame } from './testGame';

const HOUR_MS = 3_600_000;
const LEFT_AT_MS = 1_800_000_000_000;

const withVending: GameState = {
  ...freshGameState({ saveId: 'owner', economyVersion: 1, wallMs: LEFT_AT_MS }),
  businesses: [
    {
      definitionId: 'vending',
      levels: { capacity: 0, quality: 0, efficiency: 0 },
      managerOwned: false,
      capitalizedSpendCents: dollars('250'),
    },
  ],
};

const cash = (session: TestGame) => session.game.getSnapshot().state.cashCents;
const summary = (session: TestGame) => session.game.getSnapshot().state.returnSummary;

async function awayWhileRunning(session: TestGame, awayMs: number): Promise<void> {
  await session.game.pause();
  session.clock.advance(awayMs);
  await session.game.resume();
}

describe('relaunching after time away', () => {
  it('credits exactly $4,800 for ten hours with one base Vending Machine (AC09)', async () => {
    const left = await startTestGameFrom(withVending);
    const back = await left.restart({ awayMs: 10 * HOUR_MS });
    expect<bigint>(cash(back)).toBe(dollars('4800'));
    expect(summary(back)).toEqual({
      status: 'pending',
      summary: {
        awayMs: 10 * HOUR_MS,
        creditedMs: 8 * HOUR_MS,
        earnings: { businesses: dollars('4800'), rent: dollars('0') },
      },
    });
  });

  it('credits nothing more on a second immediate relaunch (AC09)', async () => {
    const left = await startTestGameFrom(withVending);
    const back = await left.restart({ awayMs: 10 * HOUR_MS });
    const again = await back.restart();
    expect<bigint>(cash(again)).toBe(dollars('4800'));
  });

  it('shows the summary again after a crash but never credits twice (AC10)', async () => {
    const left = await startTestGameFrom(withVending);
    const back = await left.restart({ awayMs: 10 * HOUR_MS });
    const afterCrash = await back.restart();
    expect<bigint>(cash(afterCrash)).toBe(dollars('4800'));
    expect(summary(afterCrash)).toMatchObject({ status: 'pending' });
  });

  it('updates peak net worth and unlocks Tier 2 from offline earnings (UX02)', async () => {
    const left = await startTestGameFrom(withVending);
    const back = await left.restart({ awayMs: 10 * HOUR_MS });
    const { state } = back.game.getSnapshot();
    expect<bigint>(state.peakNetWorthCents).toBe(dollars('5050'));
    expect(state.unlockedTiers).toEqual([1, 2]);
  });
});

describe('rent while away', () => {
  it('reports business income and rent as separate sources (UX05)', async () => {
    const left = await startTestGameFrom({
      ...withVending,
      properties: [
        {
          definitionId: 'studio',
          levels: { renovation: 0, furnishings: 0, systems: 0, expansion: 0 },
          rented: true,
          upgradeSpendCents: dollars('0'),
        },
      ],
    });
    const back = await left.restart({ awayMs: HOUR_MS });
    expect(summary(back)).toEqual({
      status: 'pending',
      summary: {
        awayMs: HOUR_MS,
        creditedMs: HOUR_MS,
        earnings: { businesses: dollars('600'), rent: dollars('6000') },
      },
    });
    expect<bigint>(cash(back)).toBe(dollars('6600'));
  });
});

describe('dismissing the return summary', () => {
  it('Continue only dismisses: no cash changes and it stays dismissed after a restart (UX05)', async () => {
    const left = await startTestGameFrom(withVending);
    const back = await left.restart({ awayMs: 10 * HOUR_MS });
    const outcome = await back.game.dispatch({
      id: 'continue-1',
      command: { type: 'AcknowledgeReturnSummary' },
    });
    expect(outcome).toMatchObject({ ok: true, cashChangeCents: dollars('0') });
    const later = await back.restart();
    expect(summary(later)).toEqual({ status: 'none' });
    expect<bigint>(cash(later)).toBe(dollars('4800'));
  });
});

describe('returning to the running app', () => {
  it('credits the capped absence once (AC09)', async () => {
    const session = await startTestGameFrom(withVending);
    await awayWhileRunning(session, 10 * HOUR_MS);
    await awayWhileRunning(session, 0);
    expect<bigint>(cash(session)).toBe(dollars('4800'));
    expect(summary(session)).toMatchObject({ status: 'pending' });
  });

  it('waits for the step before the summary, where an app open ad will go', async () => {
    const reached = deferred();
    const opened = deferred();
    const session = await startTestGameFrom(withVending, {
      beforeWarmReturnSummary: () => {
        reached.resolve();
        return opened.promise;
      },
    });
    await session.game.pause();
    session.clock.advance(HOUR_MS);
    const resumed = session.game.resume();
    await reached.promise;
    expect(summary(session)).toEqual({ status: 'none' });
    opened.resolve();
    await resumed;
    expect(summary(session)).toMatchObject({ status: 'pending' });
  });
});

describe('a pause checkpoint that saves late', () => {
  it('still credits the absence from the moment the app left, behind a tap batch', async () => {
    const session = await startTestGameFrom(withVending);
    const release = session.holdSaves();
    session.game.tap();
    const paused = session.game.pause();
    session.clock.advance(HOUR_MS);
    const resumed = session.game.resume();
    release();
    await Promise.all([paused, resumed]);
    expect<bigint>(cash(session)).toBe(dollars('601'));
  });
});

describe('an app open ad step that fails', () => {
  it('still shows the settled earnings and summary', async () => {
    const session = await startTestGameFrom(withVending, {
      beforeWarmReturnSummary: () => Promise.reject(new Error('no fill')),
    });
    await awayWhileRunning(session, HOUR_MS);
    expect<bigint>(cash(session)).toBe(dollars('600'));
    expect(summary(session)).toMatchObject({ status: 'pending' });
  });
});

describe('a wall clock set backward', () => {
  it('credits no offline time, records a diagnostic and resets the baseline', async () => {
    const left = await startTestGameFrom(withVending);
    const back = await left.restart({ awayMs: -2 * HOUR_MS });
    expect<bigint>(cash(back)).toBe(dollars('0'));
    expect(await back.diagnostics()).toEqual([
      {
        type: 'BACKWARD_WALL_CLOCK',
        checkpointWallMs: LEFT_AT_MS,
        observedWallMs: LEFT_AT_MS - 2 * HOUR_MS,
        recordedWallMs: LEFT_AT_MS - 2 * HOUR_MS,
      },
    ]);
    const later = await back.restart({ awayMs: HOUR_MS });
    expect<bigint>(cash(later)).toBe(dollars('600'));
  });
});

describe('leaving the app', () => {
  it('flushes pending taps and checkpoints before going inactive', async () => {
    const session = await startTestGame();
    session.game.tap();
    session.game.tap();
    await session.game.pause();
    const relaunched = await session.restart();
    expect<bigint>(cash(relaunched)).toBe(dollars('2'));
  });

  it('a force-kill keeps committed actions and loses at most the open tap batch', async () => {
    const session = await startTestGame();
    await session.game.dispatch({ id: 'batch-1', command: { type: 'TapBatch', taps: 120 } });
    await session.game.dispatch({
      id: 'upgrade-1',
      command: { type: 'UpgradeWallet', fromLevel: 0 },
    });
    session.game.tap();
    session.clock.advance(250);
    await session.game.flushTaps();
    session.game.tap();
    session.game.tap();
    const relaunched = await session.restart();
    const { state } = relaunched.game.getSnapshot();
    expect(state.tap).toEqual({ walletLevel: 1, totalAcceptedTaps: 121 });
    expect<bigint>(state.cashCents).toBe(dollars('21.50'));
  });
});
