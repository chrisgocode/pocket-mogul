import { useState } from 'react';

export function useAllowedToggle() {
  const [on, setOn] = useState(false);
  return { on, toggle: () => setOn(!on) };
}
