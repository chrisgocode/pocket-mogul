import type { Clock } from '@/application/ports';

function localDayKey(wallMs: number): string {
  const day = new Date(wallMs);
  return `${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`;
}

export const deviceClock: Clock = {
  monotonicMs: () => performance.now(),
  wallMs: () => Date.now(),
  localDayKey,
  schedule(delayMs, task) {
    const timer = setTimeout(task, delayMs);
    return () => clearTimeout(timer);
  },
};
