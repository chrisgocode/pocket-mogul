import { use, type ReactNode } from 'react';

import { loadDeviceGame } from '@/bootstrap/deviceGame';
import { GameProvider } from '@/features/game/GameContext';

import { SaveStoppedScreen } from './SaveStoppedScreen';

export function DeviceGameProvider({ children }: { children: ReactNode }) {
  const opened = use(loadDeviceGame());
  if (opened.status === 'stopped') return <SaveStoppedScreen reason={opened.reason} />;
  return <GameProvider game={opened.game}>{children}</GameProvider>;
}
