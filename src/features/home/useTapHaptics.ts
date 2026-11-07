import { ImpactFeedbackStyle, impactAsync } from 'expo-haptics';
import { useCallback, useRef } from 'react';

import { useGameSnapshot } from '@/features/game/GameContext';
import { feedback } from '@/ui/tokens';

export function useTapHaptics(): () => void {
  const lastHapticAt = useRef(Number.NEGATIVE_INFINITY);
  const enabled = useGameSnapshot().state.settings.haptics === 'on';
  return useCallback(() => {
    if (!enabled) return;
    const now = Date.now();
    if (now - lastHapticAt.current < feedback.hapticMinIntervalMs) return;
    lastHapticAt.current = now;
    void impactAsync(ImpactFeedbackStyle.Light);
  }, [enabled]);
}
