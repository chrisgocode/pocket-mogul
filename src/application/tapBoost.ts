import type { BoostTime } from './boostTime';
import type { GameSnapshot } from './game';
import type { AdAvailability, FullScreenAd, FullScreenAdEvent } from './ports';
import type { SnapshotStore } from './snapshotStore';
import type { AdRequest } from './telemetry';
import { boostExists } from './tapBoostView';

type Presentation =
  | { readonly status: AdAvailability; readonly recentId: string | undefined }
  | { readonly status: 'showing'; readonly id: string };

export type TapBoostDependencies = {
  readonly ad: FullScreenAd;
  readonly createId: () => string;
  readonly snapshots: SnapshotStore<GameSnapshot>;
  readonly boostTime: BoostTime;
  readonly flushTaps: () => Promise<void>;
  readonly recordReward: (presentationId: string) => void;
  readonly activatePendingGrant: () => void;
  readonly requested: (request: AdRequest) => void;
};

export type TapBoost = {
  press: () => Promise<void>;
  isPresenting: () => boolean;
};

function rewardedPresentation(presentation: Presentation): string | undefined {
  return presentation.status === 'showing' ? presentation.id : presentation.recentId;
}

type Presentations = { current: () => Presentation; publish: (next: Presentation) => void };

function presentations(snapshots: SnapshotStore<GameSnapshot>): Presentations {
  let presentation: Presentation = { status: 'loading', recentId: undefined };
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
    ads.publish({ status: 'loading', recentId: id });
    deps.boostTime.uncover('fullScreenAd');
    deps.activatePendingGrant();
    deps.ad.load();
  };
  const earned = () => {
    const id = rewardedPresentation(ads.current());
    if (id === undefined) return;
    deps.recordReward(id);
    if (ads.current().status !== 'showing') deps.activatePendingGrant();
  };
  const handle = (event: FullScreenAdEvent) => {
    const presentation = ads.current();
    if (event.type === 'earnedReward') earned();
    else if (presentation.status === 'showing') {
      if (event.type === 'closed' || event.type === 'failed') finish(presentation.id);
    } else if (event.type === 'availability') {
      ads.publish({ status: event.availability, recentId: presentation.recentId });
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

export function tapBoost(dependencies: TapBoostDependencies): TapBoost {
  const deps = { ...dependencies, ad: requestingAd(dependencies) };
  const ads = presentations(deps.snapshots);
  const events = adEvents(deps, ads);
  deps.ad.subscribe(events.handle);
  deps.ad.load();
  return {
    isPresenting: () => ads.current().status === 'showing',
    async press() {
      const presentation = ads.current();
      if (presentation.status === 'unavailable') {
        deps.ad.load();
        return;
      }
      if (presentation.status !== 'ready' || boostExists(deps.snapshots.get())) return;
      const id = deps.createId();
      ads.publish({ status: 'showing', id });
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
