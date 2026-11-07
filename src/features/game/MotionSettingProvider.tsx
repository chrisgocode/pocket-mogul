import type { ReactNode } from 'react';

import { ReducedMotionPreference } from '@/ui/motion';

import { useGameSnapshot } from './GameContext';

export function MotionSettingProvider({ children }: { children: ReactNode }) {
  const { reducedMotion } = useGameSnapshot().state.settings;
  return <ReducedMotionPreference value={reducedMotion}>{children}</ReducedMotionPreference>;
}
