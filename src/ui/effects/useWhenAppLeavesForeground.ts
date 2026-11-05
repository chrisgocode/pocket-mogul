import { useEffect } from 'react';
import { AppState } from 'react-native';

export function useWhenAppLeavesForeground(onLeave: () => void): void {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status !== 'active') onLeave();
    });
    return () => subscription.remove();
  }, [onLeave]);
}
