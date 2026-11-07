import { foregroundTime, type ForegroundTime } from './foregroundTime';
import type { Clock } from './ports';

export type BoostTimeCover = 'background' | 'fullScreenAd';

export type BoostTime = Pick<ForegroundTime, 'unsavedMs' | 'saved'> & {
  cover: (reason: BoostTimeCover) => void;
  uncover: (reason: BoostTimeCover) => void;
};

export function boostTime(clock: Clock): BoostTime {
  const time = foregroundTime(clock);
  let covers: ReadonlySet<BoostTimeCover> = new Set();
  return {
    unsavedMs: time.unsavedMs,
    saved: time.saved,
    cover(reason) {
      covers = new Set([...covers, reason]);
      time.pause();
    },
    uncover(reason) {
      covers = new Set([...covers].filter((other) => other !== reason));
      if (covers.size === 0) time.resume();
    },
  };
}
