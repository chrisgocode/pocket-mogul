import type { AdOffer } from '@/domain/adRewards';

import type { BoostTime } from './boostTime';
import type { GameSnapshot } from './game';
import type { AdAvailability, FullScreenAd, FullScreenAdEvent } from './ports';
import type { SnapshotStore } from './snapshotStore';
import type { AdRequest } from './telemetry';
import { boostExists } from './tapBoostView';

export type RewardedOffer = { readonly kind: 'tap_boost' } | AdOffer;

export type RewardedView = { readonly id: string; readonly offer: RewardedOffer };

type Presentation =
  | { readonly status: AdAvailability; readonly recent: RewardedView | undefined }
  | ({ readonly status: 'showing' } & RewardedView);

const TAP_BOOST: RewardedOffer = { kind: 'tap_boost' };

export type TapBoostDependencies = {
  readonly ad: FullScreenAd;
  readonly createId: () => string;
  readonly snapshots: SnapshotStore<GameSnapshot>;
  readonly boostTime: BoostTime;
  readonly flushTaps: () => Promise<void>;
  readonly recordReward: (view: RewardedView) => void;
  readonly canClaim: (offer: AdOffer) => boolean;
  readonly activatePendingGrant: () => void;
  readonly requested: (request: AdRequest) => void;
};

export type TapBoost = {
  press: (offer?: RewardedOffer) => Promise<void>;
  isPresenting: () => boolean;
};

function rewardedPresentation(presentation: Presentation): RewardedView | undefined {
  if (presentation.status !== 'showing') return presentation.recent;
  return { id: presentation.id, offer: presentation.offer };
}

type Presentations = { current: () => Presentation; publish: (next: Presentation) => void };

function presentations(snapshots: SnapshotStore<GameSnapshot>): Presentations {
  let presentation: Presentation = { status: 'loading', recent: undefined };
  return {
    current: () => presentation,
    publish(next) {
      presentation = next;
      snapshots.set({ ...snapshots.get(), tapBoostAd: next.status });
    },
  };
}

function adEvents(deps: TapBoostDependencies, ads: Presentations) {
  const finish = (id: string) => {
    const presentation = ads.current();
    if (presentation.status !== 'showing' || presentation.id !== id) return;
    ads.publish({ status: 'loading', recent: { id, offer: presentation.offer } });
    deps.boostTime.uncover('fullScreenAd');
    deps.activatePendingGrant();
    deps.ad.load();
  };
  const earned = () => {
    const view = rewardedPresentation(ads.current());
    if (view === undefined) return;
    deps.recordReward(view);
    if (ads.current().status !== 'showing') deps.activatePendingGrant();
  };
  const handle = (event: FullScreenAdEvent) => {
    const presentation = ads.current();
    if (event.type === 'earnedReward') earned();
    else if (presentation.status === 'showing') {
      if (event.type === 'closed' || event.type === 'failed') finish(presentation.id);
    } else if (event.type === 'availability') {
      ads.publish({ status: event.availability, recent: presentation.recent });
    }
  };
  return { handle, finish };
}

function requestingAd(deps: TapBoostDependencies): FullScreenAd {
  return {
    ...deps.ad,
    load() {
      deps.requested('load');
      deps.ad.load();
    },
    show() {
      deps.requested('show');
      return deps.ad.show();
    },
  };
}

function claimable(deps: TapBoostDependencies, offer: RewardedOffer): boolean {
  if (offer.kind === 'tap_boost') return !boostExists(deps.snapshots.get());
  return deps.canClaim(offer);
}

export function tapBoost(dependencies: TapBoostDependencies): TapBoost {
  const deps = { ...dependencies, ad: requestingAd(dependencies) };
  const ads = presentations(deps.snapshots);
  const events = adEvents(deps, ads);
  deps.ad.subscribe(events.handle);
  deps.ad.load();
  return {
    isPresenting: () => ads.current().status === 'showing',
    async press(offer = TAP_BOOST) {
      const presentation = ads.current();
      if (presentation.status === 'unavailable') {
        deps.ad.load();
        return;
      }
      if (presentation.status !== 'ready' || !claimable(deps, offer)) return;
      const id = deps.createId();
      ads.publish({ status: 'showing', id, offer });
      deps.boostTime.cover('fullScreenAd');
      await deps.flushTaps();
      try {
        await deps.ad.show();
      } catch {
        events.finish(id);
      }
    },
  };
}
