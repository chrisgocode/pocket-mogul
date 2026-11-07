import { useEffect } from 'react';

export function useSubscription<Event>(
  subscribe: (listener: (event: Event) => void) => () => void,
  listener: (event: Event) => void,
): void {
  useEffect(() => subscribe(listener), [subscribe, listener]);
}
