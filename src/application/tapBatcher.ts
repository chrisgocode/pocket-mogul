import type { CancelTimer, Clock } from './ports';

export type TapBatcher = { add: () => void; close: () => Promise<void> };

type Batch =
  | { readonly status: 'idle' }
  | { readonly status: 'open'; readonly taps: number; readonly cancelTimer: CancelTimer };

export function tapBatcher(options: {
  clock: Clock;
  windowMs: number;
  send: (taps: number) => Promise<unknown>;
}): TapBatcher {
  let batch: Batch = { status: 'idle' };

  async function close(): Promise<void> {
    if (batch.status === 'idle') return;
    const { taps, cancelTimer } = batch;
    batch = { status: 'idle' };
    cancelTimer();
    await options.send(taps);
  }

  const open = (): Batch => ({
    status: 'open',
    taps: 1,
    cancelTimer: options.clock.schedule(options.windowMs, () => void close()),
  });

  return {
    add() {
      batch = batch.status === 'open' ? { ...batch, taps: batch.taps + 1 } : open();
    },
    close,
  };
}
