import {
  appOpenDecision,
  interstitialDecision,
  recordAppOpen,
  recordInterstitial,
  recordRewardedView,
  type AdMoment,
  type NaturalBreak,
} from '@/domain/adSchedule';
import { holdsEntitlement } from '@/domain/entitlements';
import { isTutorialFinished } from '@/domain/tutorial';

import { trackedAd, type TrackedAd } from './adPresentation';
import { absence, tapIdle, type AdScheduleKeeper } from './adScheduleKeeper';
import type { Committer, GamePorts, GameSnapshot } from './game';
import type { FullScreenAd } from './ports';
import type { AdTelemetry } from './telemetry';
import { isTapBoosted } from './tapBoostView';

export type AutomaticAdStage = 'none' | 'adBreak' | 'interstitial' | 'appOpen';

type AdPlacement = 'tap_boost' | 'interstitial' | 'app_open';

type Context = {
  ports: GamePorts;
  core: Committer;
  keeper: AdScheduleKeeper;
  interstitial: TrackedAd;
  appOpen: TrackedAd;
};

function boostMoment(snapshot: GameSnapshot): AdMoment['boost'] {
  if (snapshot.state.reward.boost.status === 'pending') return 'pending';
  return isTapBoosted(snapshot) ? 'active' : 'none';
}

function momentFor(context: Context, ad: TrackedAd): AdMoment {
  const snapshot = context.core.snapshots.get();
  const wallMs = context.ports.clock.wallMs();
  return {
    wallMs,
    dayKey: context.ports.clock.localDayKey(wallMs),
    tutorial: isTutorialFinished(snapshot.state.tutorial) ? 'finished' : 'running',
    boost: boostMoment(snapshot),
    ad: ad.availability(),
  };
}

function stages(core: Committer) {
  const current = () => core.snapshots.get().automaticAd;
  const set = (automaticAd: AutomaticAdStage) =>
    core.snapshots.set({ ...core.snapshots.get(), automaticAd });
  return { current, set };
}

function sendAd(context: Context, event: AdTelemetry) {
  context.core.telemetry.ad(event, context.core.snapshots.get().state);
}

function waitFor(context: Context, ms: number): Promise<void> {
  return new Promise((resolve) => void context.ports.clock.schedule(ms, resolve));
}

async function showFullScreen(
  context: Context,
  show: { ad: TrackedAd; stage: AutomaticAdStage; onShown: () => void },
) {
  const stage = stages(context.core);
  stage.set(show.stage);
  context.keeper.cover('fullScreenAd');
  try {
    return await show.ad.present(show.onShown);
  } finally {
    context.keeper.uncover('fullScreenAd');
    stage.set('none');
  }
}

function interstitials(context: Context, presenting: () => boolean) {
  const { keeper, ports, interstitial } = context;
  const rules = ports.content.economy.ads;
  const stage = stages(context.core);
  const shown = (trigger: NaturalBreak, dayKey: string) => () => {
    keeper.update((state) => recordInterstitial(state, dayKey));
    sendAd(context, { name: 'ad_interstitial_shown', details: { trigger } });
  };
  return async (trigger: NaturalBreak, sinceTapMs: number) => {
    if (stage.current() !== 'none' || presenting()) return;
    const moment = { ...momentFor(context, interstitial), sinceTapMs };
    const decision = interstitialDecision(keeper.current(), rules, moment);
    if (decision.kind === 'wait') return;
    if (decision.kind === 'suppressed') {
      interstitial.retryIfUnavailable();
      const details = { trigger, reason: decision.reason };
      sendAd(context, { name: 'ad_interstitial_suppressed', details });
      return;
    }
    stage.set('adBreak');
    await waitFor(context, rules.adBreakCardMs);
    if (stage.current() !== 'adBreak') return;
    const onShown = shown(trigger, moment.dayKey);
    await showFullScreen(context, { ad: interstitial, stage: 'interstitial', onShown });
  };
}

function appOpenAds(context: Context) {
  const { keeper, ports, appOpen } = context;
  return async (awayMs: number) => {
    const moment = { ...momentFor(context, appOpen), awayMs };
    const decision = appOpenDecision(keeper.current(), ports.content.economy.ads, moment);
    if (decision.kind !== 'show') return;
    const onShown = () => {
      keeper.update((state) => recordAppOpen(state, moment.wallMs));
      sendAd(context, { name: 'ad_app_open_shown', details: { awayMs } });
    };
    await showFullScreen(context, { ad: appOpen, stage: 'appOpen', onShown });
  };
}

function watchClicksAndRewards(context: Context) {
  const { ads, clock } = context.ports;
  const clicked = (placement: AdPlacement) => () =>
    sendAd(context, { name: 'ad_clicked', details: { placement } });
  const onClick = (ad: FullScreenAd, placement: AdPlacement) =>
    ad.subscribe((event) => {
      if (event.type === 'clicked') clicked(placement)();
    });
  onClick(ads.rewarded, 'tap_boost');
  onClick(ads.interstitial, 'interstitial');
  onClick(ads.appOpen, 'app_open');
  ads.rewarded.subscribe((event) => {
    if (event.type === 'closed')
      context.keeper.update((state) => recordRewardedView(state, clock.wallMs()));
  });
}

function presence(context: Context) {
  const away = absence(context.ports.clock);
  const stage = stages(context.core);
  const { keeper } = context;
  return {
    present: away.present,
    back: away.back,
    left: () => {
      if (stage.current() === 'adBreak') stage.set('none');
      keeper.cover('background');
      away.left();
    },
    returned: () => {
      keeper.uncover('background');
      const awayMs = away.returning();
      if (awayMs >= context.ports.content.economy.ads.appOpenMinAwayMs) keeper.startSession();
      return awayMs;
    },
  };
}

export function automaticAds(
  ports: GamePorts,
  game: { core: Committer; rewardedPresenting: () => boolean },
) {
  const { core } = game;
  const adFree = () => holdsEntitlement(core.snapshots.get().state, 'removeAds');
  const start = adFree() ? 'idle' : 'load';
  const context: Context = {
    ports,
    core,
    keeper: core.adSchedule,
    interstitial: trackedAd(ports.ads.interstitial, start),
    appOpen: trackedAd(ports.ads.appOpen, start),
  };
  const taps = tapIdle(ports.clock);
  const away = presence(context);
  const stage = stages(core);
  const interstitialAt = interstitials(context, game.rewardedPresenting);
  const naturalBreak = (trigger: NaturalBreak) =>
    away.present() && !adFree() ? interstitialAt(trigger, taps.sinceTapMs()) : Promise.resolve();
  const appOpen = appOpenAds(context);
  watchClicksAndRewards(context);
  core.events.subscribe(() => void naturalBreak('goal_completed'));
  context.keeper.startSession();
  return {
    controls: (tap: () => void) => ({
      tap: () => {
        taps.tapped();
        tap();
      },
      naturalBreak,
    }),
    isPresenting: () => stage.current() === 'interstitial' || stage.current() === 'appOpen',
    left: away.left,
    returned: away.returned,
    back: away.back,
    beforeReturnSummary: (awayMs: number) => (adFree() ? Promise.resolve() : appOpen(awayMs)),
  };
}

export type AutomaticAds = ReturnType<typeof automaticAds>;
