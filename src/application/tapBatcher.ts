import type { CancelTimer, Clock } from './ports';

export type TapBatcher = { add(): void; close(): Promise<void> };

export function tapBatcher(options: {
  clock: Clock;
  windowMs: number;
  send: (taps: number) => Promise<unknown>;
}): TapBatcher {
  let openTaps = 0;
  let cancelTimer: CancelTimer | undefined;

  async function close(): Promise<void> {
    cancelTimer?.();
    cancelTimer = undefined;
    const taps = openTaps;
    openTaps = 0;
    if (taps > 0) await options.send(taps);
  }

  return {
    add() {
      openTaps += 1;
      cancelTimer ??= options.clock.schedule(options.windowMs, () => void close());
    },
    close,
  };
}
