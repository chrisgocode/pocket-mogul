import { useCallback, useState } from 'react';

export type TradeDraft<Side extends string, Mode extends string> = {
  readonly side: Side;
  readonly mode: Mode;
  readonly text: string;
  readonly reviewedTick: number;
};

export function useTradeDraft<Side extends string, Mode extends string>(
  initial: TradeDraft<Side, Mode>,
) {
  const [draft, setDraft] = useState(initial);
  const change = useCallback(
    (update: Partial<TradeDraft<Side, Mode>>) => setDraft((current) => ({ ...current, ...update })),
    [],
  );
  return { draft, change, reset: setDraft };
}
