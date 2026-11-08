import { writeFileSync } from 'node:fs';

import { balanceScenarios, DEFAULT_BALANCE_SEED } from '@/application/balance/scenarios';
import { simulateBalance, type BalanceRun } from '@/application/balance/simulation';
import { getContent, getPastContent } from '@/content';
import { formatMoneyExact } from '@/domain/money';
import { debtCents } from '@/domain/tax/assessment';

const MINUTE_MS = 60_000;
const TIME_DECIMALS = 2;
const policies = ['baseline', 'honest', 'evade', 'exempt'] as const;
const baseline = getPastContent().find((content) => content.economyVersion === 1)!;
const current = getContent();
const scenarios = balanceScenarios(DEFAULT_BALANCE_SEED);

function minutes(run: BalanceRun, goal: string): string {
  const reached = run.goals[goal];
  return reached === undefined
    ? 'not reached'
    : `${(reached.activeMs / MINUTE_MS).toFixed(TIME_DECIMALS)} / ${(reached.elapsedMs / MINUTE_MS).toFixed(TIME_DECIMALS)}`;
}

function taxTotals(run: BalanceRun): string[] {
  const { tax } = run;
  if (tax.status === 'notStarted') return ['$0.00', '$0.00', '$0.00', '$0.00', '0'];
  return [tax.paidCents, tax.finesPaidCents, debtCents(tax), tax.evadedCents]
    .map(formatMoneyExact)
    .concat(String(tax.returns.filter((r) => r.filing.status === 'audited').length));
}

const rows = policies.flatMap((policy) =>
  scenarios.map((scenario) => {
    process.stdout.write(`${policy}: ${scenario.name}, ${scenario.policy}\n`);
    const content = policy === 'baseline' ? baseline : current;
    const run = simulateBalance(
      { ...scenario, taxPolicy: policy === 'baseline' ? 'honest' : policy },
      content,
    );
    return `| ${policy} | ${scenario.name} | ${scenario.policy} | ${minutes(run, 'first_business')} | ${minutes(run, 'peak_1m')} | ${minutes(run, 'peak_1b')} | ${taxTotals(run).join(' | ')} |`;
  }),
);

const text = [
  '# Tax balance report',
  '',
  `Seed: ${DEFAULT_BALANCE_SEED}. Old economy ${baseline.economyVersion}; current economy ${current.economyVersion}.`,
  '',
  'Runs use the existing manager/hands-on, purchase-policy and offline schedules, two taps/second and five-second action steps. Milestones show active / elapsed minutes. Runs stop at $1B peak net worth or 40 active hours. Rates and audit outcomes use the real engine and seeded ledger.',
  '',
  'Honest players file every ready return; evaders file zero every time. Both use personal cash, then explicitly withdraw Treasury money and voluntarily pay assessed debt before discretionary investment. Exempt runs use the scripted entitlement boundary. No reward ads or actual purchases occur. Purchase policies retain the existing gross-profit payback heuristic so comparisons use the same decision policy.',
  '',
  'One seed is a reproducible example, not a statistical audit-risk study. Expected evasion cost at a fixed bill is 40% × (back tax + 2× fine) = 120% of honest tax; early reinvestment and observed recoveries still affect progression. Recovery uses existing income and explicit transfers, never invented cash or asset liquidation.',
  '',
  '| Tax policy | Schedule / management | Purchase policy | First business | $1M | $1B | Tax paid | Fines paid | Outstanding debt | Successfully evaded | Audits |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ...rows,
  '',
].join('\n');
writeFileSync('docs/tax-balance-report.md', text);
process.stdout.write('Wrote docs/tax-balance-report.md\n');
