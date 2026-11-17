import { useCallback, useRef } from 'react';

export function useSingleFlight(): (task: () => Promise<void>) => Promise<void> {
  const pending = useRef(false);
  return useCallback(async (task: () => Promise<void>) => {
    if (pending.current) return;
    pending.current = true;
    try {
      await task();
    } finally {
      pending.current = false;
    }
  }, []);
}
