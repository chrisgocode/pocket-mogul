import type { CancelTimer, Clock } from './ports';

export type ForegroundTime = {
  unsavedMs: () => number;
  saved: (elapsedMs: number) => void;
  pause: () => void;
  resume: () => void;
};

type Tracking =
  | { readonly status: 'running'; readonly bankedMs: number; readonly sinceMs: number }
  | { readonly status: 'paused'; readonly bankedMs: number };

function unsavedAt(tracking: Tracking, nowMs: number): number {
  return tracking.bankedMs + (tracking.status === 'running' ? nowMs - tracking.sinceMs : 0);
}

export function foregroundTime(clock: Clock): ForegroundTime {
  let tracking: Tracking = { status: 'running', bankedMs: 0, sinceMs: clock.monotonicMs() };
  return {
    unsavedMs: () => Math.floor(unsavedAt(tracking, clock.monotonicMs())),
    saved(elapsedMs) {
      const nowMs = clock.monotonicMs();
      const bankedMs = unsavedAt(tracking, nowMs) - elapsedMs;
      tracking =
        tracking.status === 'running'
          ? { status: 'running', bankedMs, sinceMs: nowMs }
          : { status: 'paused', bankedMs };
    },
    pause() {
      tracking = { status: 'paused', bankedMs: unsavedAt(tracking, clock.monotonicMs()) };
    },
    resume() {
      if (tracking.status === 'paused') {
        tracking = { status: 'running', bankedMs: tracking.bankedMs, sinceMs: clock.monotonicMs() };
      }
    },
  };
}

const NOT_SCHEDULED: CancelTimer = () => undefined;

export function repeatEvery(
  clock: Clock,
  repeat: { intervalMs: number; task: () => void },
): CancelTimer {
  let cancel = NOT_SCHEDULED;
  const next = () => {
    cancel = clock.schedule(repeat.intervalMs, () => {
      next();
      repeat.task();
    });
  };
  next();
  return () => cancel();
}
