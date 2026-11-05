type Batch = { status: 'idle' } | { status: 'open'; taps: number; cancel: () => void };

export function batcher(schedule: (task: () => void) => () => void) {
  let batch: Batch = { status: 'idle' };
  return {
    add() {
      batch =
        batch.status === 'open'
          ? { ...batch, taps: batch.taps + 1 }
          : {
              status: 'open',
              taps: 1,
              cancel: schedule(() => {
                batch = { status: 'idle' };
              }),
            };
    },
  };
}
