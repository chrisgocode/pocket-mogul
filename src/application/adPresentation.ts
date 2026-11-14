import type { AdAvailability, FullScreenAd } from './ports';

export type PresentationResult = 'closed' | 'failed';

export type TrackedAd = {
  availability: () => AdAvailability;
  retryIfUnavailable: () => void;
  present: (onShown: () => void) => Promise<PresentationResult>;
};

function presentationEnd(ad: FullScreenAd) {
  const settle = deferredResult();
  const stop = ad.subscribe((event) => {
    if (event.type !== 'closed' && event.type !== 'failed') return;
    stop();
    settle.resolve(event.type);
  });
  return { ended: settle.promise, stop };
}

function deferredResult() {
  const resolvers: ((result: PresentationResult) => void)[] = [];
  const promise = new Promise<PresentationResult>((resolve) => void resolvers.push(resolve));
  return {
    promise,
    resolve: (result: PresentationResult) => {
      for (const resolve of resolvers) resolve(result);
    },
  };
}

async function presentUntilClosed(
  ad: FullScreenAd,
  onShown: () => void,
): Promise<PresentationResult> {
  const end = presentationEnd(ad);
  try {
    await ad.show();
  } catch {
    end.stop();
    ad.load();
    return 'failed';
  }
  onShown();
  const result = await end.ended;
  ad.load();
  return result;
}

export function trackedAd(ad: FullScreenAd, start: 'load' | 'idle' = 'load'): TrackedAd {
  let availability: AdAvailability = start === 'load' ? 'loading' : 'unavailable';
  ad.subscribe((event) => {
    if (event.type === 'availability') availability = event.availability;
  });
  if (start === 'load') ad.load();
  return {
    availability: () => availability,
    retryIfUnavailable: () => {
      if (availability === 'unavailable') ad.load();
    },
    present: (onShown) => presentUntilClosed(ad, onShown),
  };
}
