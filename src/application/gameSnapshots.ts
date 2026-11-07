import type { GameState } from '@/domain/gameState';

import { boostTime } from './boostTime';
import type { CommandTime } from './commitCommand';
import { foregroundTime } from './foregroundTime';
import type { GameSnapshot } from './game';
import type { SettledTaps } from './gameTaps';
import type { SaveNotice } from './openSave';
import type { Clock } from './ports';
import type { SnapshotStore } from './snapshotStore';

export type Opened = { readonly state: GameState; readonly notice: SaveNotice };

type UnsavedTime = Pick<CommandTime, 'elapsedMs' | 'boostElapsedMs'>;

export function openingSnapshot(opened: Opened): GameSnapshot {
  return {
    ...opened,
    pendingTaps: 0,
    pendingBoostedTaps: 0,
    unsavedElapsedMs: 0,
    unsavedBoostMs: 0,
    tapBoostAd: 'loading',
  };
}

export function gameClocks(clock: Clock) {
  const time = foregroundTime(clock);
  const boost = boostTime(clock);
  return {
    time,
    boostTime: boost,
    unsaved: (): UnsavedTime => ({
      elapsedMs: time.unsavedMs(),
      boostElapsedMs: boost.unsavedMs(),
    }),
    saved(unsaved: UnsavedTime) {
      time.saved(unsaved.elapsedMs);
      boost.saved(unsaved.boostElapsedMs);
    },
  };
}

type GameClocks = ReturnType<typeof gameClocks>;

type PublishedChange = { state?: GameState | undefined; settled: SettledTaps };

export function publisher(snapshots: SnapshotStore<GameSnapshot>, clocks: GameClocks) {
  return (change: PublishedChange) => {
    const current = snapshots.get();
    snapshots.set({
      ...current,
      state: change.state ?? current.state,
      pendingTaps: current.pendingTaps - change.settled.taps,
      pendingBoostedTaps: current.pendingBoostedTaps - change.settled.boostedTaps,
      unsavedElapsedMs: clocks.time.unsavedMs(),
      unsavedBoostMs: clocks.boostTime.unsavedMs(),
    });
  };
}
