import type { CommandTime } from './commitCommand';

type Elapsed = Pick<CommandTime, 'elapsedMs' | 'boostElapsedMs'>;

type Clock = { unsaved: () => Elapsed; saved: (elapsed: Elapsed) => void };

export function recoveryTime(clock: Clock) {
  let consumed: Elapsed = { elapsedMs: 0, boostElapsedMs: 0 };
  return {
    capture(wall: Pick<CommandTime, 'wallMs' | 'dayKey'>): CommandTime {
      const unsaved = clock.unsaved();
      return {
        ...wall,
        elapsedMs: consumed.elapsedMs + unsaved.elapsedMs,
        boostElapsedMs: consumed.boostElapsedMs + unsaved.boostElapsedMs,
      };
    },
    remaining(captured: CommandTime): CommandTime {
      return {
        wallMs: captured.wallMs,
        dayKey: captured.dayKey,
        elapsedMs: Math.max(0, captured.elapsedMs - consumed.elapsedMs),
        boostElapsedMs: Math.max(0, captured.boostElapsedMs - consumed.boostElapsedMs),
      };
    },
    saved(elapsed: Elapsed): void {
      clock.saved(elapsed);
      consumed = {
        elapsedMs: consumed.elapsedMs + elapsed.elapsedMs,
        boostElapsedMs: consumed.boostElapsedMs + elapsed.boostElapsedMs,
      };
    },
  };
}
