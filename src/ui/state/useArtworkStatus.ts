import { useState } from 'react';

export function useArtworkStatus() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  return {
    status,
    onDisplay: () => setStatus('ready'),
    onError: () => setStatus('failed'),
  };
}
