import type { CancelTimer, Clock } from './ports';

export type TapBatch = { readonly taps: number; readonly boosted: boolean };

export type TapBatcher = { add: (boosted: boolean) => void; close: () => Promise<void> };

type Batch =
  | { readonly status: 'idle' }
  | {
      readonly status: 'open';
      readonly taps: number;
      readonly boosted: boolean;
      readonly cancelTimer: CancelTimer;
    };

export function tapBatcher(options: {
  clock: Clock;
  windowMs: number;
  send: (batch: TapBatch) => Promise<unknown>;
}): TapBatcher {
  let batch: Batch = { status: 'idle' };

  async function close(): Promise<void> {
    if (batch.status === 'idle') return;
    const { taps, boosted, cancelTimer } = batch;
    batch = { status: 'idle' };
    cancelTimer();
    await options.send({ taps, boosted });
  }

  const open = (boosted: boolean): Batch => ({
    status: 'open',
    taps: 1,
    boosted,
    cancelTimer: options.clock.schedule(options.windowMs, () => void close()),
  });

  return {
    add(boosted) {
      if (batch.status === 'open' && batch.boosted === boosted) {
        batch = { ...batch, taps: batch.taps + 1 };
        return;
      }
      void close();
      batch = open(boosted);
    },
    close,
  };
}
