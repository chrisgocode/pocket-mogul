import type { CommandOutcome } from '@/domain/commands';

import type { AutomaticAds } from './automaticAds';
import type { Committer } from './game';
import type { ForegroundLoops } from './foregroundLoops';
import type { TapBoost } from './tapBoost';

type Lifecycle = {
  core: Committer;
  boost: TapBoost;
  checkpoint: () => Promise<CommandOutcome>;
  loops: ForegroundLoops;
  ads: AutomaticAds;
  onWarmResume: (awayMs: number) => Promise<unknown>;
};

export function lifecycle(game: Lifecycle) {
  const { core, loops } = game;
  let leftDuringAd = false;
  return {
    async pause() {
      leftDuringAd = game.boost.isPresenting() || game.ads.isPresenting();
      if (leftDuringAd) return;
      game.ads.left();
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
      const awayMs = game.ads.returned();
      core.time.resume();
      core.boostTime.uncover('background');
      loops.start();
      try {
        await game.onWarmResume(awayMs);
      } finally {
        game.ads.back();
      }
    },
  };
}
