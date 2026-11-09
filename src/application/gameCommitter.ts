import type { CommandEnvelope } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';

import { commandRecovery, recoveryAttempt, retryUntilSaved } from './commandRecovery';
import type { GamePorts, GameSnapshot } from './game';
import { commitCommand, type CommandTime, type Committed } from './commitCommand';
import { announce, feeds } from './gameFeeds';
import { gameClocks, openingSnapshot, publisher, type Opened } from './gameSnapshots';
import { NO_SETTLED_TAPS, type SettledTaps } from './gameTaps';
import { backUpIfDue } from './saveBackups';
import { SAVE_FORMAT, type SaveFormat } from './saveFormat';
import { recoveryTime } from './recoveryTime';
import { serialQueue } from './serialQueue';
import { snapshotStore } from './snapshotStore';
import { gameTelemetry } from './telemetry';

type RunOptions = {
  active?: () => boolean;
  retryUntilSaved?: boolean;
  settled?: SettledTaps;
  issuedAtWallMs?: number;
  beforePublish?: (() => Promise<void>) | undefined;
};

type CommitStep = (current: GameState, time: CommandTime) => Promise<Committed>;

async function runBeforePublish(step: (() => Promise<void>) | undefined): Promise<void> {
  try {
    await step?.();
  } catch {
    return;
  }
}

type Observers = {
  events: Parameters<typeof announce>[0];
  telemetry: ReturnType<typeof gameTelemetry>;
  state: GameState;
};

function observe(observers: Observers, committed: Committed): void {
  announce(observers.events, committed);
  observers.telemetry.committed(committed, observers.state);
}

const saveFormatOf = (ports: GamePorts): SaveFormat => ports.saveFormat ?? SAVE_FORMAT;

const backUp = (ports: GamePorts, saved: { revision: number; wallMs: number }) =>
  backUpIfDue(ports.store, { ...saved, format: saveFormatOf(ports) });

type CommitContext = {
  ports: GamePorts;
  snapshots: ReturnType<typeof snapshotStore<GameSnapshot>>;
  clocks: ReturnType<typeof gameClocks>;
  live: ReturnType<typeof feeds>;
  publish: ReturnType<typeof publisher>;
  telemetry: ReturnType<typeof gameTelemetry>;
  queue: ReturnType<typeof serialQueue>;
};

function commitOperations(context: CommitContext) {
  const { ports, snapshots, clocks, live, publish, telemetry, queue } = context;
  const recovery = commandRecovery();
  const timing = recoveryTime(clocks);
  const perform = async (step: CommitStep, options: RunOptions, captured: CommandTime) => {
    const time = timing.remaining(captured);
    const committed = await step(clocks.scheduled(snapshots.get().state), time);
    if (options.active?.() === false) return committed.outcome;
    if (committed.state !== undefined) {
      timing.saved(time);
      await backUp(ports, { revision: committed.state.revision, wallMs: time.wallMs });
      await runBeforePublish(options.beforePublish);
    }
    if (options.active?.() === false) return committed.outcome;
    live.record(committed);
    publish({ state: committed.state, settled: options.settled ?? NO_SETTLED_TAPS });
    observe({ events: live.events, telemetry, state: snapshots.get().state }, committed);
    return committed.outcome;
  };
  const commit = (step: CommitStep, options: RunOptions = {}) => {
    const wallMs = options.issuedAtWallMs ?? ports.clock.wallMs();
    const attempt = recoveryAttempt(() => timing.capture(wallMs));
    return queue.run(async () => {
      if (options.retryUntilSaved === true) attempt();
      const result = await recovery.run({
        retryUntilSaved: options.retryUntilSaved === true,
        perform: (ownTurn) =>
          perform(step, ownTurn ? options : { ...options, beforePublish: undefined }, attempt()),
      });
      if (result.blocked && options.active?.() !== false)
        publish({ settled: options.settled ?? NO_SETTLED_TAPS });
      return result.outcome;
    });
  };
  return commit;
}

export function committer(ports: GamePorts, opened: Opened) {
  const snapshots = snapshotStore<GameSnapshot>(openingSnapshot(opened));
  const clocks = gameClocks(ports.clock, opened.state.adSchedule);
  const queue = serialQueue();
  const live = feeds(ports, queue);
  const publish = publisher(snapshots, clocks);
  const telemetry = gameTelemetry(ports);
  const commit = commitOperations({ ports, snapshots, clocks, live, publish, telemetry, queue });
  const run = (envelope: CommandEnvelope, options: RunOptions = {}) =>
    commit((current, stepTime) => commitCommand(ports, { current, envelope, time: stepTime }), {
      ...options,
      retryUntilSaved: retryUntilSaved(envelope),
    });
  return {
    snapshots,
    backUp: (saved: { revision: number; wallMs: number }) => queue.run(() => backUp(ports, saved)),
    ...clocks,
    queue,
    telemetry,
    ...live,
    run,
    commit,
    refresh: () => publish({ settled: NO_SETTLED_TAPS }),
  };
}

export type Committer = ReturnType<typeof committer>;
