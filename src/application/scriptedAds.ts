import type { AdPort, FullScreenAd, FullScreenAdEvent } from './ports';

export type AdScript =
  | 'success'
  | 'closeWithoutReward'
  | 'duplicateReward'
  | 'rewardAfterClose'
  | 'crashAfterReward'
  | 'clickThenClose'
  | 'held'
  | 'showFails';

export type AdFill = 'fill' | 'noFill';

const EARNED: FullScreenAdEvent = { type: 'earnedReward' };
const CLOSED: FullScreenAdEvent = { type: 'closed' };
const CLICKED: FullScreenAdEvent = { type: 'clicked' };

const SCRIPTED_EVENTS: Record<AdScript, readonly FullScreenAdEvent[]> = {
  success: [EARNED, CLOSED],
  closeWithoutReward: [CLOSED],
  duplicateReward: [EARNED, EARNED, CLOSED],
  rewardAfterClose: [CLOSED, EARNED],
  crashAfterReward: [EARNED],
  clickThenClose: [CLICKED, CLOSED],
  held: [],
  showFails: [],
};

type MockAd = 'empty' | 'loaded' | 'showing';

export type ScriptedAd = {
  readonly shows: () => number;
  readonly emit: (event: FullScreenAdEvent) => void;
  readonly fill: (fill: AdFill) => void;
};

type ScriptedPlacement = { readonly ad: FullScreenAd; readonly controls: ScriptedAd };

export type ScriptedAds = AdPort &
  ScriptedAd & {
    readonly automatic: { readonly interstitial: ScriptedAd; readonly appOpen: ScriptedAd };
  };

type MockState = { ad: MockAd; fill: AdFill; shows: number; scripts: AdScript[] };

type PlacementSetup = { fill?: AdFill; scripts?: readonly AdScript[]; fallback: AdScript };

function mockShow(mock: MockState, fallback: AdScript, emit: (event: FullScreenAdEvent) => void) {
  if (mock.ad !== 'loaded') return Promise.reject(new Error('The ad is not loaded'));
  const script = mock.scripts.shift() ?? fallback;
  mock.shows += 1;
  if (script === 'showFails') {
    mock.ad = 'empty';
    return Promise.reject(new Error('The ad could not be shown'));
  }
  mock.ad = 'showing';
  for (const event of SCRIPTED_EVENTS[script]) emit(event);
  return Promise.resolve();
}

function scriptedPlacement(setup: PlacementSetup): ScriptedPlacement {
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
  const ad: FullScreenAd = {
    load() {
      if (mock.ad !== 'empty') return;
      emit({ type: 'availability', availability: 'loading' });
      if (mock.fill === 'fill') mock.ad = 'loaded';
      emit({ type: 'availability', availability: mock.ad === 'loaded' ? 'ready' : 'unavailable' });
    },
    show: () => mockShow(mock, setup.fallback, emit),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  const controls: ScriptedAd = {
    shows: () => mock.shows,
    emit,
    fill: (fill) => {
      mock.fill = fill;
    },
  };
  return { ad, controls };
}

export type AutomaticAdSetup = { fill?: AdFill; scripts?: readonly AdScript[] };

export function scriptedAds(
  setup: {
    fill?: AdFill;
    scripts?: readonly AdScript[];
    interstitial?: AutomaticAdSetup;
    appOpen?: AutomaticAdSetup;
  } = {},
): ScriptedAds {
  const rewarded = scriptedPlacement({ ...setup, fallback: 'success' });
  const interstitial = scriptedPlacement({ ...setup.interstitial, fallback: 'closeWithoutReward' });
  const appOpen = scriptedPlacement({ ...setup.appOpen, fallback: 'closeWithoutReward' });
  return {
    rewarded: rewarded.ad,
    interstitial: interstitial.ad,
    appOpen: appOpen.ad,
    ...rewarded.controls,
    automatic: { interstitial: interstitial.controls, appOpen: appOpen.controls },
  };
}
