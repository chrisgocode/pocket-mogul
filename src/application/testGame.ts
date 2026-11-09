import { disabledBilling } from '@/infrastructure/disabledBilling';
import { DatabaseSync } from 'node:sqlite';

import { z } from 'zod';

import { getContent, type Business, type Content } from '@/content';
import { moneyCents, type MoneyCents } from '@/domain/money';
import type { GameState } from '@/domain/gameState';
import { nodeSqliteDriver } from '@/infrastructure/nodeSqliteDriver';
import type { SqlDriver } from '@/infrastructure/sqlDriver';
import { openSqlSaveStore } from '@/infrastructure/sqlSaveStore';

import { decodeSave } from './saveFormat';
import { createGame, type Game, type GamePorts, type OpenedGame } from './game';
import type { Clock, Diagnostic } from './ports';
import { scriptedAds, type ScriptedAds } from './scriptedAds';

const TEST_WALL_START_MS = 1_800_000_000_000;
const DAY_MS = 86_400_000;

type ScheduledTask = { dueMs: number; task: () => void };

export type FakeClock = Clock & { advance: (ms: number) => void };

type Timeline = { readonly elapsedMs: number; readonly tasks: readonly ScheduledTask[] };

function fakeClock(wallStartMs: number): FakeClock {
  let timeline: Timeline = { elapsedMs: 0, tasks: [] };
  return {
    monotonicMs: () => timeline.elapsedMs,
    wallMs: () => wallStartMs + timeline.elapsedMs,
    localDayKey: (wallMs) => `day-${Math.floor(wallMs / DAY_MS)}`,
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

export type WriteFaults = { failWrites: boolean; failWritesMatching?: RegExp | undefined };

export type ReadFaults = { failReads: boolean };

type SaveGate = { passed: () => Promise<void>; hold: () => () => void };

const doNothing = (): void => undefined;

export function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve: () => void = doNothing;
  const promise = new Promise<void>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

function saveGate(): SaveGate {
  let held: Promise<void> = Promise.resolve();
  return {
    passed: () => held,
    hold() {
      const { promise, resolve } = deferred();
      held = promise;
      return () => {
        held = Promise.resolve();
        resolve();
      };
    },
  };
}

const failsOn = (faults: WriteFaults, statement: string) =>
  faults.failWrites || (faults.failWritesMatching?.test(statement) ?? false);

type Faults = { writes: WriteFaults; reads: ReadFaults };

function faultyDriver(driver: SqlDriver, faults: Faults, gate: SaveGate): SqlDriver {
  return {
    exclusive: async (work) => {
      await gate.passed();
      return driver.exclusive((sql) =>
        work({
          first: sql.first,
          all: (statement, params) =>
            faults.reads.failReads
              ? Promise.reject(new Error('read failed'))
              : sql.all(statement, params),
          run: (statement, params) =>
            failsOn(faults.writes, statement)
              ? Promise.reject(new Error('disk full'))
              : sql.run(statement, params),
        }),
      );
    },
  };
}

export type TestGame = {
  game: Game;
  clock: FakeClock;
  ads: ScriptedAds;
  faults: WriteFaults;
  readFaults: ReadFaults;
  holdSaves: () => () => void;
  restart: (relaunch?: Relaunch) => Promise<TestGame>;
  reopen: (relaunch?: Relaunch) => Promise<OpenedGame>;
  diagnostics: () => Promise<readonly Diagnostic[]>;
  saveDocument: () => string;
  replaceSaveDocument: (document: string) => void;
  deleteSaveDocument: () => void;
  corruptBackups: () => void;
  receiptIds: () => readonly string[];
};

type TestHooks = Partial<
  Pick<
    GamePorts,
    | 'beforeWarmReturnSummary'
    | 'pastContent'
    | 'telemetry'
    | 'saveFormat'
    | 'taxEntitlement'
    | 'billing'
    | 'purchasePolicy'
  >
> & {
  content?: Content;
  ads?: ScriptedAds;
};

type Relaunch = { awayMs?: number } & TestHooks;

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

const savedDocumentRow = z.object({ document: z.string() });
const receiptRows = z.array(z.object({ command_id: z.string() }));

function rawSave(database: DatabaseSync) {
  return {
    saveDocument: () =>
      savedDocumentRow.parse(database.prepare('SELECT document FROM save_state').get()).document,
    replaceSaveDocument: (document: string) => {
      database.prepare('UPDATE save_state SET document = ?').run(document);
    },
    deleteSaveDocument: () => {
      database.exec('DELETE FROM save_state');
    },
    corruptBackups: () => {
      database.exec("UPDATE save_backups SET document = 'damaged'");
    },
    receiptIds: () =>
      receiptRows
        .parse(database.prepare('SELECT command_id FROM command_receipts').all())
        .map((row) => row.command_id),
  };
}

type OpenedTestGame = {
  opened: OpenedGame;
  clock: FakeClock;
  ads: ScriptedAds;
  faults: WriteFaults;
  readFaults: ReadFaults;
  holdSaves: () => () => void;
  diagnostics: () => Promise<readonly Diagnostic[]>;
};

async function openTestGame(save: TestSave = freshTestSave()): Promise<OpenedTestGame> {
  const clock = fakeClock(save.wallStartMs);
  const faults: WriteFaults = { failWrites: false };
  const readFaults: ReadFaults = { failReads: false };
  const gate = saveGate();
  const ads = save.hooks.ads ?? scriptedAds();
  const store = await openSqlSaveStore(
    faultyDriver(nodeSqliteDriver(save.database), { writes: faults, reads: readFaults }, gate),
  );
  const opened = await createGame({
    content: getContent(),
    billing: disabledBilling(),
    ...save.hooks,
    ads,
    clock,
    store,
    createId: save.createId,
  });
  return {
    opened,
    clock,
    ads,
    faults,
    readFaults,
    holdSaves: gate.hold,
    diagnostics: store.loadDiagnostics,
  };
}

export async function startTestGame(save: TestSave = freshTestSave()): Promise<TestGame> {
  const { opened, ...session } = await openTestGame(save);
  if (opened.status !== 'ready') throw new Error(`The test save stopped: ${opened.reason}`);
  const awayFrom = ({ awayMs = 0, ...hooks }: Relaunch = {}) => ({
    ...save,
    hooks: { ...save.hooks, ...hooks },
    wallStartMs: session.clock.wallMs() + awayMs,
  });
  return {
    ...session,
    ...rawSave(save.database),
    game: opened.game,
    restart: (absence) => startTestGame(awayFrom(absence)),
    reopen: async (absence) => (await openTestGame(awayFrom(absence))).opened,
  };
}

export function startObservedTestGame(hooks: TestHooks): Promise<TestGame> {
  return startTestGame({ ...freshTestSave(), hooks });
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

export async function startTestGameFromDocument(
  document: string,
  wallStartMs: number,
  hooks: TestHooks = {},
): Promise<TestGame> {
  const save = { ...freshTestSave(), wallStartMs, hooks };
  await openSqlSaveStore(nodeSqliteDriver(save.database));
  save.database.prepare('INSERT INTO save_state (id, document) VALUES (1, ?)').run(document);
  return startTestGame(save);
}

export function withBusinessPrice(
  content: Content,
  change: { economyVersion: number; businessId: string; pricePerCustomer: MoneyCents },
): Content {
  const changed = (definition: Business) => {
    if (definition.id !== change.businessId) return definition;
    const customers = definition.revenuePerDay / definition.pricePerCustomer;
    return {
      ...definition,
      pricePerCustomer: change.pricePerCustomer,
      revenuePerDay: moneyCents(customers * change.pricePerCustomer),
    };
  };
  return {
    ...content,
    economyVersion: change.economyVersion,
    businesses: content.businesses.map(changed),
  };
}

export function withBusinessCosts(
  content: Content,
  change: { businessId: string; costsPerDay: MoneyCents },
): Content {
  const changed = (definition: Business) =>
    definition.id === change.businessId
      ? { ...definition, costsPerDay: change.costsPerDay }
      : definition;
  return { ...content, businesses: content.businesses.map(changed) };
}

export function withoutIncidents(content: Content): Content {
  return {
    ...content,
    businesses: content.businesses.map((business) => ({ ...business, incidents: [] })),
  };
}

export function currentState(document: string): GameState {
  const decoded = decodeSave(document);
  if (decoded.status !== 'current')
    throw new Error(`Expected a current save, got ${decoded.status}`);
  return decoded.state;
}
