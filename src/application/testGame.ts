import { DatabaseSync } from 'node:sqlite';

import { getContent } from '@/content';
import type { GameState } from '@/domain/gameState';
import { nodeSqliteDriver } from '@/infrastructure/nodeSqliteDriver';
import type { SqlDriver } from '@/infrastructure/sqlDriver';
import { openSqlSaveStore } from '@/infrastructure/sqlSaveStore';

import { createGame, type Game, type GamePorts } from './game';
import type { Clock, Diagnostic } from './ports';

const TEST_WALL_START_MS = 1_800_000_000_000;

type ScheduledTask = { dueMs: number; task: () => void };

export type FakeClock = Clock & { advance: (ms: number) => void };

type Timeline = { readonly elapsedMs: number; readonly tasks: readonly ScheduledTask[] };

function fakeClock(wallStartMs: number): FakeClock {
  let timeline: Timeline = { elapsedMs: 0, tasks: [] };
  return {
    monotonicMs: () => timeline.elapsedMs,
    wallMs: () => wallStartMs + timeline.elapsedMs,
    schedule(delayMs, task) {
      const scheduled = { dueMs: timeline.elapsedMs + delayMs, task };
      timeline = { ...timeline, tasks: [...timeline.tasks, scheduled] };
      return () => {
        timeline = { ...timeline, tasks: timeline.tasks.filter((other) => other !== scheduled) };
      };
    },
    advance(ms) {
      const elapsedMs = timeline.elapsedMs + ms;
      const due = timeline.tasks.filter((scheduled) => scheduled.dueMs <= elapsedMs);
      timeline = {
        elapsedMs,
        tasks: timeline.tasks.filter((scheduled) => scheduled.dueMs > elapsedMs),
      };
      for (const scheduled of due) scheduled.task();
    },
  };
}

function sequentialIds(): () => string {
  let next = 0;
  return () => {
    next += 1;
    return `test-id-${next}`;
  };
}

export type WriteFaults = { failWrites: boolean };

type SaveGate = { passed: () => Promise<void>; hold: () => () => void };

function saveGate(): SaveGate {
  let held: Promise<void> = Promise.resolve();
  return {
    passed: () => held,
    hold() {
      const { promise, resolve } = Promise.withResolvers<void>();
      held = promise;
      return () => {
        held = Promise.resolve();
        resolve();
      };
    },
  };
}

function faultyDriver(driver: SqlDriver, faults: WriteFaults, gate: SaveGate): SqlDriver {
  return {
    exclusive: async (work) => {
      await gate.passed();
      return driver.exclusive((sql) =>
        work({
          first: sql.first,
          all: sql.all,
          run: (statement, params) =>
            faults.failWrites ? Promise.reject(new Error('disk full')) : sql.run(statement, params),
        }),
      );
    },
  };
}

export type TestGame = {
  game: Game;
  clock: FakeClock;
  faults: WriteFaults;
  holdSaves: () => () => void;
  restart: (absence?: { awayMs: number }) => Promise<TestGame>;
  diagnostics: () => Promise<readonly Diagnostic[]>;
};

type TestHooks = Pick<GamePorts, 'beforeWarmReturnSummary'>;

type TestSave = {
  database: DatabaseSync;
  createId: () => string;
  wallStartMs: number;
  hooks: TestHooks;
};

const freshTestSave = (): TestSave => ({
  database: new DatabaseSync(':memory:'),
  createId: sequentialIds(),
  wallStartMs: TEST_WALL_START_MS,
  hooks: {},
});

export async function startTestGame(save: TestSave = freshTestSave()): Promise<TestGame> {
  const clock = fakeClock(save.wallStartMs);
  const faults: WriteFaults = { failWrites: false };
  const gate = saveGate();
  const store = await openSqlSaveStore(faultyDriver(nodeSqliteDriver(save.database), faults, gate));
  const game = await createGame({
    ...save.hooks,
    clock,
    store,
    content: getContent(),
    createId: save.createId,
  });
  return {
    game,
    clock,
    faults,
    holdSaves: gate.hold,
    restart: (absence = { awayMs: 0 }) =>
      startTestGame({ ...save, wallStartMs: clock.wallMs() + absence.awayMs }),
    diagnostics: store.loadDiagnostics,
  };
}

export function nextPublish(game: Game): Promise<void> {
  return new Promise((resolve) => {
    const unsubscribe = game.subscribe(() => {
      unsubscribe();
      resolve();
    });
  });
}

export async function startTestGameFrom(
  saved: GameState,
  hooks: TestHooks = {},
): Promise<TestGame> {
  const save = { ...freshTestSave(), wallStartMs: saved.clock.lastWallCheckpointMs, hooks };
  const store = await openSqlSaveStore(nodeSqliteDriver(save.database));
  await store.transact((tx) => tx.writeState(saved));
  return startTestGame(save);
}
