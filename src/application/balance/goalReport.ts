import { formatMoneyCompact } from '@/domain/money';

import type { BalanceRun } from './simulation';

const PER_THOUSAND = 1000n;
const TENTHS = 10;

function share(run: BalanceRun): string {
  const { goalCashCents, businessIncomeCents } = run.rewards;
  if (businessIncomeCents === 0n) return 'n/a';
  const perThousand = Number((goalCashCents * PER_THOUSAND) / businessIncomeCents);
  return `${(perThousand / TENTHS).toFixed(1)}%`;
}

export function goalReport(runs: readonly BalanceRun[]): string[] {
  return [
    '## Goal rewards',
    '',
    'Every run claims a goal reward as soon as the goal is reached, and each daily briefing reward as soon as its task is done. Goal cash is a bonus: it is shown against the business income earned over the same run.',
    '',
    '| Run | Rewards claimed | Goal cash | Daily briefing cash | Business income | Goal cash against business income |',
    '| --- | --- | --- | --- | --- | --- |',
    ...runs.map(
      (run) =>
        `| ${run.scenario.name}, ${run.scenario.policy} | ${run.rewards.goalsClaimed} | ${formatMoneyCompact(run.rewards.goalCashCents)} | ${formatMoneyCompact(run.rewards.briefingCashCents)} | ${formatMoneyCompact(run.rewards.businessIncomeCents)} | ${share(run)} |`,
    ),
  ];
}
