import { useCallback, useState } from 'react';

export type TradeDraft<Side extends string, Mode extends string, Order> = {
  readonly side: Side;
  readonly mode: Mode;
  readonly text: string;
  readonly order: Order;
  readonly reviewedTick: number;
};

export function useTradeDraft<Side extends string, Mode extends string, Order>(
  initial: TradeDraft<Side, Mode, Order>,
) {
  const [draft, setDraft] = useState(initial);
  const change = useCallback(
    (update: Partial<TradeDraft<Side, Mode, Order>>) =>
      setDraft((current) => ({ ...current, ...update })),
    [],
  );
  return { draft, change, reset: setDraft };
}
