import { ImpactFeedbackStyle, impactAsync } from 'expo-haptics';
import { useCallback, useRef } from 'react';

import { feedback } from '@/ui/tokens';

export function useTapHaptics(): () => void {
  const lastHapticAt = useRef(Number.NEGATIVE_INFINITY);
  return useCallback(() => {
    const now = Date.now();
    if (now - lastHapticAt.current < feedback.hapticMinIntervalMs) return;
    lastHapticAt.current = now;
    void impactAsync(ImpactFeedbackStyle.Light);
  }, []);
}
