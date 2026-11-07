import { createContext, use, useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

export type MotionPreference = 'system' | 'on' | 'off';

export const ReducedMotionPreference = createContext<MotionPreference>('system');

type SystemMotion = 'unknown' | 'reduced' | 'full';

const systemMotion: { current: SystemMotion; listeners: Set<() => void> } = {
  current: 'unknown',
  listeners: new Set<() => void>(),
};

function publishSystemMotion(reduced: boolean): void {
  systemMotion.current = reduced ? 'reduced' : 'full';
  for (const listener of systemMotion.listeners) listener();
}

function subscribeToSystemMotion(listener: () => void): () => void {
  systemMotion.listeners.add(listener);
  const subscription = AccessibilityInfo.addEventListener(
    'reduceMotionChanged',
    publishSystemMotion,
  );
  if (systemMotion.current === 'unknown') {
    AccessibilityInfo.isReduceMotionEnabled().then(publishSystemMotion, () => undefined);
  }
  return () => {
    systemMotion.listeners.delete(listener);
    subscription.remove();
  };
}

const readSystemMotion = (): SystemMotion => systemMotion.current;

export function useReducedMotion(): boolean {
  const preference = use(ReducedMotionPreference);
  const system = useSyncExternalStore(subscribeToSystemMotion, readSystemMotion);
  if (preference === 'system') return system === 'reduced';
  return preference === 'on';
}

export function useSheetAnimation(): 'slide' | 'fade' {
  return useReducedMotion() ? 'fade' : 'slide';
}

export function useScreenAnimation(): 'default' | 'fade' {
  return useReducedMotion() ? 'fade' : 'default';
}
