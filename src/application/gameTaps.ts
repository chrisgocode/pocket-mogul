import type { CommandEnvelope, CommandOutcome } from '@/domain/commands';

import type { BoostTime } from './boostTime';
import type { GameSnapshot } from './game';
import type { Clock } from './ports';
import type { SnapshotStore } from './snapshotStore';
import { tapBatcher, type TapBatch } from './tapBatcher';
import { isTapBoosted } from './tapBoostView';

export type SettledTaps = { readonly taps: number; readonly boostedTaps: number };

export const NO_SETTLED_TAPS: SettledTaps = { taps: 0, boostedTaps: 0 };

export type TapRun = (
  envelope: CommandEnvelope,
  options: { settled?: SettledTaps; issuedAtWallMs?: number },
) => Promise<CommandOutcome>;

function settledTaps(batch: TapBatch): SettledTaps {
  return { taps: batch.taps, boostedTaps: batch.boosted ? batch.taps : 0 };
}

function boostedNow(snapshot: GameSnapshot, boostTime: Pick<BoostTime, 'unsavedMs'>): boolean {
  return isTapBoosted({ state: snapshot.state, unsavedBoostMs: boostTime.unsavedMs() });
}

function withPendingTap(snapshot: GameSnapshot, boosted: boolean): GameSnapshot {
  return {
    ...snapshot,
    pendingTaps: snapshot.pendingTaps + 1,
    pendingBoostedTaps: snapshot.pendingBoostedTaps + (boosted ? 1 : 0),
  };
}

export function gameTaps(options: {
  clock: Clock;
  windowMs: number;
  createId: () => string;
  snapshots: SnapshotStore<GameSnapshot>;
  run: TapRun;
  queueIdle: () => Promise<void>;
  boostTime: Pick<BoostTime, 'unsavedMs'>;
}) {
  const { snapshots, run } = options;
  const taps = tapBatcher({
    clock: options.clock,
    windowMs: options.windowMs,
    send: (batch) =>
      run(
        { id: `tap-${options.createId()}`, command: { type: 'TapBatch', ...batch } },
        { settled: settledTaps(batch) },
      ),
  });
  return {
    dispatch: async (envelope: CommandEnvelope) => {
      const issuedAtWallMs = options.clock.wallMs();
      if (envelope.command.type !== 'TapBatch') await taps.close();
      return run(envelope, { issuedAtWallMs });
    },
    tap: () => {
      const boosted = boostedNow(snapshots.get(), options.boostTime);
      taps.add(boosted);
      snapshots.set(withPendingTap(snapshots.get(), boosted));
    },
    flushTaps: async () => {
      await taps.close();
      await options.queueIdle();
    },
  };
}
