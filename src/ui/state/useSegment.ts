import { useState } from 'react';

export function useSegment<Segment extends string>(initial: Segment) {
  const [selected, select] = useState<Segment>(initial);
  return { selected, select };
}
