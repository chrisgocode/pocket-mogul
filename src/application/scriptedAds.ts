import type { AdPort, FullScreenAd, FullScreenAdEvent } from './ports';

export type AdScript =
  | 'success'
  | 'closeWithoutReward'
  | 'duplicateReward'
  | 'rewardAfterClose'
  | 'crashAfterReward'
  | 'held'
  | 'showFails';

export type AdFill = 'fill' | 'noFill';

const EARNED: FullScreenAdEvent = { type: 'earnedReward' };
const CLOSED: FullScreenAdEvent = { type: 'closed' };

const SCRIPTED_EVENTS: Record<AdScript, readonly FullScreenAdEvent[]> = {
  success: [EARNED, CLOSED],
  closeWithoutReward: [CLOSED],
  duplicateReward: [EARNED, EARNED, CLOSED],
  rewardAfterClose: [CLOSED, EARNED],
  crashAfterReward: [EARNED],
  held: [],
  showFails: [],
};

type MockAd = 'empty' | 'loaded' | 'showing';

export type ScriptedAds = AdPort & {
  readonly shows: () => number;
  readonly emit: (event: FullScreenAdEvent) => void;
  readonly fill: (fill: AdFill) => void;
};

type MockState = { ad: MockAd; fill: AdFill; shows: number; scripts: AdScript[] };

function mockRewarded(mock: MockState, emit: (event: FullScreenAdEvent) => void) {
  return {
    load() {
      if (mock.ad !== 'empty') return;
      emit({ type: 'availability', availability: 'loading' });
      if (mock.fill === 'fill') mock.ad = 'loaded';
      emit({ type: 'availability', availability: mock.ad === 'loaded' ? 'ready' : 'unavailable' });
    },
    show() {
      if (mock.ad !== 'loaded') return Promise.reject(new Error('The ad is not loaded'));
      const script = mock.scripts.shift() ?? 'success';
      mock.shows += 1;
      if (script === 'showFails') {
        mock.ad = 'empty';
        return Promise.reject(new Error('The ad could not be shown'));
      }
      mock.ad = 'showing';
      for (const event of SCRIPTED_EVENTS[script]) emit(event);
      return Promise.resolve();
    },
  };
}

export function scriptedAds(
  setup: { fill?: AdFill; scripts?: readonly AdScript[] } = {},
): ScriptedAds {
  const listeners = new Set<(event: FullScreenAdEvent) => void>();
  const mock: MockState = {
    ad: 'empty',
    fill: setup.fill ?? 'fill',
    shows: 0,
    scripts: [...(setup.scripts ?? [])],
  };
  const emit = (event: FullScreenAdEvent) => {
    if (event.type === 'closed') mock.ad = 'empty';
    for (const listener of listeners) listener(event);
  };
  const rewarded: FullScreenAd = {
    ...mockRewarded(mock, emit),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return {
    rewarded,
    shows: () => mock.shows,
    emit,
    fill: (fill) => {
      mock.fill = fill;
    },
  };
}
