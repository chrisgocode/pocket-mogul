import { useState } from 'react';

export function UsesState() {
  const [count] = useState(0);
  return count;
}
