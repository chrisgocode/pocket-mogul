import { DatabaseSync } from 'node:sqlite';

import { getContent } from '@/content';
import { nodeSqliteDriver } from '@/infrastructure/nodeSqliteDriver';
import type { SqlDriver } from '@/infrastructure/sqlDriver';
import { openSqlSaveStore } from '@/infrastructure/sqlSaveStore';

import { createGame, type Game } from './game';
import type { Clock } from './ports';

const TEST_WALL_START_MS = 1_800_000_000_000;

type ScheduledTask = { dueMs: number; task: () => void };

export type FakeClock = Clock & { advance: (ms: number) => void };

type Timeline = { readonly elapsedMs: number; readonly tasks: readonly ScheduledTask[] };

function fakeClock(): FakeClock {
  let timeline: Timeline = { elapsedMs: 0, tasks: [] };
  return {
    monotonicMs: () => timeline.elapsedMs,
    wallMs: () => TEST_WALL_START_MS + timeline.elapsedMs,
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

function faultyDriver(driver: SqlDriver, faults: WriteFaults): SqlDriver {
  return {
    exclusive: (work) =>
      driver.exclusive((sql) =>
        work({
          first: sql.first,
          run: (statement, params) =>
            faults.failWrites ? Promise.reject(new Error('disk full')) : sql.run(statement, params),
        }),
      ),
  };
}

export type TestGame = {
  game: Game;
  clock: FakeClock;
  faults: WriteFaults;
  restart: () => Promise<TestGame>;
};

type TestSave = { database: DatabaseSync; createId: () => string };

export async function startTestGame(
  save: TestSave = { database: new DatabaseSync(':memory:'), createId: sequentialIds() },
): Promise<TestGame> {
  const clock = fakeClock();
  const faults: WriteFaults = { failWrites: false };
  const game = await createGame({
    clock,
    store: await openSqlSaveStore(faultyDriver(nodeSqliteDriver(save.database), faults)),
    content: getContent(),
    createId: save.createId,
  });
  return { game, clock, faults, restart: () => startTestGame(save) };
}

export function nextPublish(game: Game): Promise<void> {
  return new Promise((resolve) => {
    const unsubscribe = game.subscribe(() => {
      unsubscribe();
      resolve();
    });
  });
}
