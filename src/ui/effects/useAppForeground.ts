import { useEffect } from 'react';
import { AppState } from 'react-native';

export function useAppForeground(handlers: { onLeave: () => void; onReturn: () => void }): void {
  const { onLeave, onReturn } = handlers;
  useEffect(() => {
    let inForeground = true;
    const subscription = AppState.addEventListener('change', (status) => {
      const returning = status === 'active';
      if (returning === inForeground) return;
      inForeground = returning;
      if (returning) onReturn();
      else onLeave();
    });
    return () => subscription.remove();
  }, [onLeave, onReturn]);
}
