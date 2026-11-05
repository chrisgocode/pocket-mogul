export function batcher(schedule: (task: () => void) => () => void) {
  let openTaps = 0;
  let cancelTimer: (() => void) | undefined;
  return {
    add() {
      openTaps += 1;
      cancelTimer ??= schedule(() => {
        openTaps = 0;
        cancelTimer = undefined;
      });
    },
  };
}
