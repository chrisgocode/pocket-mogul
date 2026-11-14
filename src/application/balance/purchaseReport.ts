import type { Content } from '@/content';
import type { Entitlements } from '@/domain/entitlements';
import { formatMoneyCompact } from '@/domain/money';

import { REPORTED_GOALS } from './analysis';
import type { BalanceRun, BalanceScenario, Moment } from './simulation';
import { simulateBalance } from './simulation';

const OWNED: Entitlements = {
  goldenWallet: ['balance-report'],
  nightManager: ['balance-report'],
};

const COMPARED_MANAGEMENT = 'manager';
const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const HOUR_DECIMALS = 2;

export type PurchaseComparison = { readonly plain: BalanceRun; readonly owned: BalanceRun };

const hasGaps = (scenario: BalanceScenario) =>
  scenario.sessions.some((session) => session.awayMs > 0);

export function comparePurchases(
  runs: readonly BalanceRun[],
  content: Content,
): readonly PurchaseComparison[] {
  return runs
    .filter((run) => hasGaps(run.scenario) && run.scenario.management === COMPARED_MANAGEMENT)
    .map((plain) => ({
      plain,
      owned: simulateBalance({ ...plain.scenario, entitlements: OWNED }, content),
    }));
}

function reached(at: Moment | undefined): string {
  if (at === undefined) return 'not reached';
  return at.elapsedMs < MS_PER_HOUR
    ? `${(at.elapsedMs / MS_PER_MINUTE).toFixed(1)} min`
    : `${(at.elapsedMs / MS_PER_HOUR).toFixed(HOUR_DECIMALS)} h`;
}

const worth = (run: BalanceRun) => formatMoneyCompact(run.final.worth.netWorthCents);

function rows(comparison: PurchaseComparison): string[] {
  const { plain, owned } = comparison;
  const goals = REPORTED_GOALS.map(
    (goal) =>
      `| ${plain.scenario.policy} | ${goal.label} | ${reached(plain.goals[goal.goalId])} | ${reached(owned.goals[goal.goalId])} |`,
  );
  return [
    ...goals,
    `| ${plain.scenario.policy} | Net worth at the end | ${worth(plain)} after ${reached(plain.final)} | ${worth(owned)} after ${reached(owned.final)} |`,
  ];
}

export function purchaseReport(comparisons: readonly PurchaseComparison[]): string[] {
  if (comparisons.length === 0) return [];
  return [
    '## Golden wallet and Night manager',
    '',
    'The runs above own no purchase. These repeat the manager runs with offline gaps for a player who owns both from the first tap: every tap pays double, and an absence credits up to 24 hours, so the 12-hour gap counts in full. Times are total elapsed time, since the purchases change what an absence is worth.',
    '',
    '| Policy | Milestone | Without | With both |',
    '| --- | --- | --- | --- |',
    ...comparisons.flatMap(rows),
    '',
  ];
}
