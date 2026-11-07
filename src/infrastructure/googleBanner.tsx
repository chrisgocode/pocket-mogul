import { use } from 'react';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

import { mobileAdsStarted } from './googleMobileAds';

const BANNER_AD_UNIT_ID = TestIds.ADAPTIVE_BANNER;

export function GoogleBanner({
  onLoaded,
  onClicked,
}: {
  onLoaded: () => void;
  onClicked: () => void;
}) {
  const canRequestAds = use(mobileAdsStarted());
  if (!canRequestAds) return null;
  return (
    <BannerAd
      unitId={BANNER_AD_UNIT_ID}
      size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER}
      onAdLoaded={() => onLoaded()}
      onAdClicked={onClicked}
    />
  );
}
