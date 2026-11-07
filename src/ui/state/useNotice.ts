import { useCallback, useState } from 'react';

export function useNotice<Notice>() {
  const [notice, setNotice] = useState<Notice | undefined>(undefined);
  const dismiss = useCallback(() => setNotice(undefined), []);
  return { notice, show: setNotice, dismiss };
}
