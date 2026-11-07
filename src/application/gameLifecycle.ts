import type { CommandOutcome } from '@/domain/commands';

import type { Committer } from './game';
import type { ForegroundLoops } from './foregroundLoops';
import type { TapBoost } from './tapBoost';

type Lifecycle = {
  core: Committer;
  boost: TapBoost;
  checkpoint: () => Promise<CommandOutcome>;
  loops: ForegroundLoops;
  onWarmResume: () => Promise<unknown>;
};

export function lifecycle(game: Lifecycle) {
  const { core, loops } = game;
  let leftDuringAd = false;
  return {
    async pause() {
      leftDuringAd = game.boost.isPresenting();
      if (leftDuringAd) return;
      loops.stop();
      core.time.pause();
      core.boostTime.cover('background');
      await game.checkpoint();
    },
    async resume() {
      if (leftDuringAd) {
        leftDuringAd = false;
        return;
      }
      core.time.resume();
      core.boostTime.uncover('background');
      loops.start();
      await game.onWarmResume();
    },
  };
}
