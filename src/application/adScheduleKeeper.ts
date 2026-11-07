import { advanceForeground, startSession, type AdScheduleState } from '@/domain/adSchedule';

import { coveredTime, type BoostTimeCover } from './boostTime';
import type { Clock } from './ports';

export type AdScheduleKeeper = {
  current: () => AdScheduleState;
  update: (change: (state: AdScheduleState) => AdScheduleState) => void;
  startSession: () => void;
  cover: (reason: BoostTimeCover) => void;
  uncover: (reason: BoostTimeCover) => void;
};

export function adScheduleKeeper(clock: Clock, saved: AdScheduleState): AdScheduleKeeper {
  const foreground = coveredTime(clock);
  let state = saved;
  const current = () => {
    const elapsedMs = foreground.unsavedMs();
    foreground.saved(elapsedMs);
    state = advanceForeground(state, elapsedMs);
    return state;
  };
  const update = (change: (before: AdScheduleState) => AdScheduleState) => {
    state = change(current());
  };
  return {
    current,
    update,
    startSession: () => update(startSession),
    cover: foreground.cover,
    uncover: foreground.uncover,
  };
}

export function tapIdle(clock: Clock) {
  let lastTapMs = Number.NEGATIVE_INFINITY;
  return {
    tapped: () => {
      lastTapMs = clock.monotonicMs();
    },
    sinceTapMs: () => clock.monotonicMs() - lastTapMs,
  };
}

type Presence =
  | { readonly status: 'present' }
  | { readonly status: 'away'; readonly sinceWallMs: number }
  | { readonly status: 'returning' };

export function absence(clock: Clock) {
  let presence: Presence = { status: 'present' };
  return {
    present: () => presence.status === 'present',
    left: () => {
      presence = { status: 'away', sinceWallMs: clock.wallMs() };
    },
    returning: (): number => {
      const awayMs = presence.status === 'away' ? clock.wallMs() - presence.sinceWallMs : 0;
      presence = { status: 'returning' };
      return Math.max(0, awayMs);
    },
    back: () => {
      presence = { status: 'present' };
    },
  };
}
