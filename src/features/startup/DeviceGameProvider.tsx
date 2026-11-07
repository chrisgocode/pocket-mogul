import { use, type ReactNode } from 'react';

import { DeviceBanner } from '@/bootstrap/deviceBanner';
import { loadDeviceGame } from '@/bootstrap/deviceGame';
import { BannerViewProvider, type RenderBanner } from '@/features/ads/BannerViewContext';
import { GameProvider } from '@/features/game/GameContext';
import { MotionSettingProvider } from '@/features/game/MotionSettingProvider';

import { SaveStoppedScreen } from './SaveStoppedScreen';

const renderDeviceBanner: RenderBanner = (props) => <DeviceBanner {...props} />;

export function DeviceGameProvider({ children }: { children: ReactNode }) {
  const opened = use(loadDeviceGame());
  if (opened.status === 'stopped') return <SaveStoppedScreen reason={opened.reason} />;
  return (
    <GameProvider game={opened.game}>
      <BannerViewProvider render={renderDeviceBanner}>
        <MotionSettingProvider>{children}</MotionSettingProvider>
      </BannerViewProvider>
    </GameProvider>
  );
}
