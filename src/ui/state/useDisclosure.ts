import { useCallback, useState } from 'react';

export function useDisclosure() {
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => setExpanded((open) => !open), []);
  return { expanded, toggle };
}
