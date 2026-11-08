import { dollars } from '@/domain/money';

import type { PolicyName } from './policies';
import type { BalanceScenario, Session } from './simulation';

export const DEFAULT_BALANCE_SEED = 'pocket-mogul-balance-1';

const ACTIVE_PLAY_LIMIT_MS = 144_000_000;
const SESSION_MS = 1_800_000;
const DAYTIME_GAP_MS = 10_800_000;
const OVERNIGHT_GAP_MS = 43_200_000;

const BALANCE_POLICIES: readonly PolicyName[] = [
  'cheapestNext',
  'bestPayback',
  'saveForNextBusiness',
];

type Schedule = { readonly name: string; readonly sessions: readonly Session[] };

const SCHEDULES: readonly Schedule[] = [
  { name: 'Continuous active play', sessions: [{ activeMs: ACTIVE_PLAY_LIMIT_MS, awayMs: 0 }] },
  {
    name: 'Sessions with offline gaps',
    sessions: [
      { activeMs: SESSION_MS, awayMs: DAYTIME_GAP_MS },
      { activeMs: SESSION_MS, awayMs: DAYTIME_GAP_MS },
      { activeMs: SESSION_MS, awayMs: OVERNIGHT_GAP_MS },
    ],
  },
];

export function balanceScenarios(seed: string): readonly BalanceScenario[] {
  return SCHEDULES.flatMap((schedule) =>
    BALANCE_POLICIES.flatMap((policy) =>
      (['manager', 'handsOn'] as const).map((management) => ({
        name: `${schedule.name}, ${management}`,
        management,
        payoutPercent: 50,
        seed,
        policy,
        tapsPerSecond: 2,
        stepMs: 5000,
        sessions: schedule.sessions,
        maxActiveMs: ACTIVE_PLAY_LIMIT_MS,
        stopAtPeakCents: dollars('1,000,000,000'),
      })),
    ),
  );
}
