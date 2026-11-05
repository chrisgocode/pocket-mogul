import { repeatEvery } from './foregroundTime';
import type { CancelTimer, Clock } from './ports';

const DISPLAY_REFRESH_MS = 1_000;

export type ForegroundLoops = { start: () => void; stop: () => void };

export function foregroundLoops(options: {
  clock: Clock;
  checkpointMs: number;
  checkpoint: () => void;
  refresh: () => void;
}): ForegroundLoops {
  let running: readonly CancelTimer[] = [];
  const start = () => {
    if (running.length > 0) return;
    running = [
      repeatEvery(options.clock, { intervalMs: options.checkpointMs, task: options.checkpoint }),
      repeatEvery(options.clock, { intervalMs: DISPLAY_REFRESH_MS, task: options.refresh }),
    ];
  };
  start();
  return {
    start,
    stop() {
      for (const cancel of running) cancel();
      running = [];
    },
  };
}
