import { use, type ReactNode } from 'react';

import { loadDeviceGame } from '@/bootstrap/deviceGame';
import { GameProvider } from '@/features/game/GameContext';

export function DeviceGameProvider({ children }: { children: ReactNode }) {
  return <GameProvider game={use(loadDeviceGame())}>{children}</GameProvider>;
}
