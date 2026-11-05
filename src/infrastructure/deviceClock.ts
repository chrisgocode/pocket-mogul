import type { Clock } from '@/application/ports';

export const deviceClock: Clock = {
  monotonicMs: () => performance.now(),
  wallMs: () => Date.now(),
  schedule(delayMs, task) {
    const timer = setTimeout(task, delayMs);
    return () => clearTimeout(timer);
  },
};
