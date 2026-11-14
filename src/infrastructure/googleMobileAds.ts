import mobileAds, {
  AdEventType,
  AdsConsent,
  AppOpenAd,
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

import type { AdPort, FullScreenAd, FullScreenAdEvent } from '@/application/ports';

const REWARDED_AD_UNIT_ID = TestIds.REWARDED;
const INTERSTITIAL_AD_UNIT_ID = TestIds.INTERSTITIAL;
const APP_OPEN_AD_UNIT_ID = TestIds.APP_OPEN;

const TEST_DEVICE_IDENTIFIERS: string[] = [];

async function consentAllowsAds(): Promise<boolean> {
  try {
    await AdsConsent.gatherConsent();
  } catch {
    return (await AdsConsent.getConsentInfo()).canRequestAds;
  }
  return (await AdsConsent.getConsentInfo()).canRequestAds;
}

async function startMobileAds(): Promise<boolean> {
  const canRequestAds = await consentAllowsAds();
  await mobileAds().setRequestConfiguration({ testDeviceIdentifiers: TEST_DEVICE_IDENTIFIERS });
  if (!canRequestAds) return false;
  await mobileAds().initialize();
  return true;
}

let started: Promise<boolean> | undefined;

function mobileAdsStarted(): Promise<boolean> {
  started ??= startMobileAds().catch(() => false);
  return started;
}

type Listener = (event: FullScreenAdEvent) => void;

type SdkFullScreenAd = Pick<InterstitialAd, 'addAdEventListener' | 'load' | 'show'>;

const READY: FullScreenAdEvent = { type: 'availability', availability: 'ready' };

function fullScreenAd(ad: SdkFullScreenAd, emit: Listener): FullScreenAd['load'] {
  ad.addAdEventListener(AdEventType.CLICKED, () => emit({ type: 'clicked' }));
  ad.addAdEventListener(AdEventType.CLOSED, () => emit({ type: 'closed' }));
  ad.addAdEventListener(AdEventType.ERROR, (error) =>
    emit(
      error.phase === 'show'
        ? { type: 'failed' }
        : { type: 'availability', availability: 'unavailable' },
    ),
  );
  const loadWhenAllowed = async () => {
    if (await mobileAdsStarted()) ad.load();
    else emit({ type: 'availability', availability: 'unavailable' });
  };
  return () => {
    emit({ type: 'availability', availability: 'loading' });
    void loadWhenAllowed();
  };
}

function placement(ad: SdkFullScreenAd, onCreated: (emit: Listener) => void): FullScreenAd {
  const listeners = new Set<Listener>();
  const emit = (event: FullScreenAdEvent) => {
    for (const listener of listeners) listener(event);
  };
  onCreated(emit);
  return {
    load: fullScreenAd(ad, emit),
    show: () => ad.show(),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function rewardedAd(): FullScreenAd {
  const ad = RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID);
  return placement(ad, (emit) => {
    ad.addAdEventListener(RewardedAdEventType.LOADED, () => emit(READY));
    ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => emit({ type: 'earnedReward' }));
  });
}

function automaticAd(ad: InterstitialAd | AppOpenAd): FullScreenAd {
  return placement(ad, (emit) => ad.addAdEventListener(AdEventType.LOADED, () => emit(READY)));
}

export function googleMobileAds(): AdPort {
  return {
    rewarded: rewardedAd(),
    interstitial: automaticAd(InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID)),
    appOpen: automaticAd(AppOpenAd.createForAdRequest(APP_OPEN_AD_UNIT_ID)),
  };
}
