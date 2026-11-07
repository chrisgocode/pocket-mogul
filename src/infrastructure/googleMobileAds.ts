import mobileAds, {
  AdEventType,
  AdsConsent,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

import type { AdPort, FullScreenAd, FullScreenAdEvent } from '@/application/ports';

const REWARDED_AD_UNIT_ID = TestIds.REWARDED;

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

function safelyStarted(): Promise<boolean> {
  return startMobileAds().catch(() => false);
}

type Listener = (event: FullScreenAdEvent) => void;

function rewardedAd(started: Promise<boolean>): FullScreenAd {
  const listeners = new Set<Listener>();
  const emit = (event: FullScreenAdEvent) => {
    for (const listener of listeners) listener(event);
  };
  const ad = RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID);
  ad.addAdEventListener(RewardedAdEventType.LOADED, () =>
    emit({ type: 'availability', availability: 'ready' }),
  );
  ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => emit({ type: 'earnedReward' }));
  ad.addAdEventListener(AdEventType.CLOSED, () => emit({ type: 'closed' }));
  ad.addAdEventListener(AdEventType.ERROR, (error) =>
    emit(
      error.phase === 'show'
        ? { type: 'failed' }
        : { type: 'availability', availability: 'unavailable' },
    ),
  );
  const loadWhenAllowed = async () => {
    if (await started) ad.load();
    else emit({ type: 'availability', availability: 'unavailable' });
  };
  return {
    load() {
      emit({ type: 'availability', availability: 'loading' });
      void loadWhenAllowed();
    },
    show: () => ad.show(),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function googleMobileAds(): AdPort {
  return { rewarded: rewardedAd(safelyStarted()) };
}
