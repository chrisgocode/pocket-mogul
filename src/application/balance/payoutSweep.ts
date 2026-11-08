import type { Content } from '@/content';
import { dollars } from '@/domain/money';
import { simulateBalance, type BalanceRun } from './simulation';

const SECOND_BUSINESS = 2;
const DECIMALS = 2;
const PAYOUT_STEP = 10;
const WHOLE_PERCENT = 100;
const ACTIVE_LIMIT_MS = 3_600_000;
const STEP_MS = 1000;
const MS_PER_MINUTE = 60_000;

export function sweepPayouts(seed: string, content: Content): readonly BalanceRun[] {
  return (['manager', 'handsOn'] as const).flatMap((management) =>
    Array.from({ length: WHOLE_PERCENT / PAYOUT_STEP + 1 }, (_, index) =>
      simulateBalance(
        {
          name: management,
          seed,
          management,
          payoutPercent: index * PAYOUT_STEP,
          policy: 'bestPayback',
          tapsPerSecond: 2,
          stepMs: STEP_MS,
          sessions: [{ activeMs: ACTIVE_LIMIT_MS, awayMs: 0 }],
          maxActiveMs: ACTIVE_LIMIT_MS,
          stopAtPeakCents: dollars('1,000,000,000'),
          stopAtBusinessCount: SECOND_BUSINESS,
        },
        content,
      ),
    ),
  );
}

export function payoutReport(runs: readonly BalanceRun[]): string[] {
  const reached = runs.filter((run) => run.businesses.length >= SECOND_BUSINESS);
  return [
    '## Payout sweep',
    '',
    'Ad-free, continuous play at two taps/second from a fresh save, bestPayback purchases, one-hour active limit. Stop on the second distinct business purchase. Deposits remain allowed; no treasury withdrawals. Ties are retained.',
    '',
    ...(['manager', 'handsOn'] as const).map((management) => {
      const matching = reached.filter((run) => run.scenario.management === management);
      const fastest = Math.min(...matching.map((run) => run.final.activeMs));
      const winners = matching
        .filter((run) => run.final.activeMs === fastest)
        .map((run) => `${run.scenario.payoutPercent}%`);
      return `${management}: fastest payout shares ${winners.join(', ') || 'none reached'}${matching.length === 0 ? '' : ` (${(fastest / MS_PER_MINUTE).toFixed(DECIMALS)} active minutes)`}.`;
    }),
    '',
    '| Management | Payout | Next business (active minutes) |',
    '| --- | --- | --- |',
    ...runs.map(
      (run) =>
        `| ${run.scenario.management} | ${run.scenario.payoutPercent}% | ${run.businesses.length < SECOND_BUSINESS ? 'not reached' : (run.final.activeMs / MS_PER_MINUTE).toFixed(DECIMALS)} |`,
    ),
    '',
  ];
}
