import type { TapBoostView } from '@/application/tapBoostView';

const SECONDS_PER_MINUTE = 60;
const SECONDS_DIGITS = 2;

export type TapBoostText = {
  readonly title: string;
  readonly detail: string;
  readonly buttonLabel: string;
  readonly enabled: boolean;
};

function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  const rest = String(seconds % SECONDS_PER_MINUTE).padStart(SECONDS_DIGITS, '0');
  return `${minutes}:${rest}`;
}

const WAITING: Record<'loading' | 'showing' | 'pending', TapBoostText> = {
  loading: {
    title: 'Tap Boost',
    detail: 'Getting an ad ready.',
    buttonLabel: 'Loading ad…',
    enabled: false,
  },
  showing: {
    title: 'Tap Boost',
    detail: 'Finish the ad to earn your boost.',
    buttonLabel: 'Ad playing…',
    enabled: false,
  },
  pending: {
    title: 'Tap Boost',
    detail: 'Reward earned. Your boost is starting.',
    buttonLabel: 'Starting boost…',
    enabled: false,
  },
};

const UNAVAILABLE: TapBoostText = {
  title: 'Tap Boost',
  detail: 'No ad is available right now. Tapping still works.',
  buttonLabel: 'Try again',
  enabled: true,
};

export function tapBoostText(view: TapBoostView): TapBoostText {
  if (view.status === 'ready') {
    return {
      title: 'Tap Boost',
      detail: `Watch an ad to earn ${view.multiplier}x per tap for ${view.durationSeconds} seconds.`,
      buttonLabel: `Watch ad · ${view.multiplier}x for ${view.durationSeconds}s`,
      enabled: true,
    };
  }
  if (view.status === 'active') {
    return {
      title: `${view.multiplier}x boost · ${formatCountdown(view.remainingSeconds)} left`,
      detail: 'Boost time pauses while the app is in the background.',
      buttonLabel: 'Boost running',
      enabled: false,
    };
  }
  return view.status === 'unavailable' ? UNAVAILABLE : WAITING[view.status];
}
