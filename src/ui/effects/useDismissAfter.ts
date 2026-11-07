import { useEffect } from 'react';

export function useDismissAfter(shown: unknown, change: { ms: number; dismiss: () => void }): void {
  const { ms, dismiss } = change;
  useEffect(() => {
    if (shown === undefined) return undefined;
    const timer = setTimeout(dismiss, ms);
    return () => clearTimeout(timer);
  }, [shown, ms, dismiss]);
}
