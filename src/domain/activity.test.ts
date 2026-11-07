import { EMPTY_ACTIVITY, NO_EARNINGS, recordActivity } from './activity';
import { dollars } from './money';

const MINUTE_MS = 60_000;

const tapped = { ...NO_EARNINGS, taps: 2, tapCents: dollars('2') };

describe('grouped earnings', () => {
  it('keeps adding to one group for ten simulation minutes', () => {
    const first = recordActivity(EMPTY_ACTIVITY, { earned: tapped, events: [], atMs: 0 });
    const later = recordActivity(first.log, {
      earned: tapped,
      events: [],
      atMs: 10 * MINUTE_MS - 1,
    });
    expect(later.entries).toEqual([]);
    expect(later.log.open).toEqual({ ...tapped, fromMs: 0, taps: 4, tapCents: dollars('4') });
  });

  it('closes the group into one entry once it spans ten simulation minutes', () => {
    const first = recordActivity(EMPTY_ACTIVITY, { earned: tapped, events: [], atMs: 0 });
    const closed = recordActivity(first.log, {
      earned: NO_EARNINGS,
      events: [],
      atMs: 10 * MINUTE_MS,
    });
    expect(closed.log.open).toBeNull();
    expect(closed.entries).toEqual([
      { kind: 'earnings', ...tapped, fromMs: 0, sequence: 1, simulationMs: 10 * MINUTE_MS },
    ]);
    expect(closed.log.lifetime.byKind.earnings).toBe(1);
  });
});
