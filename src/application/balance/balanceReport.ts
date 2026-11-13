import { payoutReport, sweepPayouts } from './payoutSweep';
import { actionReport, deepReport } from './deepReport';
import type { Content } from '@/content';
import { formatMoneyCompact, formatMoneyExact, moneyCents } from '@/domain/money';

import { analyzeRun, REPORTED_GOALS, type RunAnalysis } from './analysis';
import { checkProfitLoops, type LoopCheck } from './profitLoops';
import { balanceScenarios } from './scenarios';
import { simulateBalance, type BalanceRun, type BalanceScenario, type Moment } from './simulation';

export type BalanceReport = {
  readonly seed: string;
  readonly economyVersion: number;
  readonly unlockableTiers: readonly number[];
  readonly runs: readonly BalanceRun[];
  readonly loops: readonly LoopCheck[];
  readonly payoutRuns: readonly BalanceRun[];
};

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const SECONDS_SHOWN_BELOW_MS = 120_000;
const HOURS_SHOWN_FROM_MS = 3_600_000;
const SMALLEST_PERCENT_SHOWN = 0.1;
const HOUR_DECIMALS = 2;

export function runBalance(options: {
  seed: string;
  content: Content;
  scenarios?: readonly BalanceScenario[];
}): BalanceReport {
  const scenarios = options.scenarios ?? balanceScenarios(options.seed);
  return {
    seed: options.seed,
    economyVersion: options.content.economyVersion,
    unlockableTiers: Object.keys(options.content.economy.tierUnlocks).map(Number),
    runs: scenarios.map((scenario) => simulateBalance(scenario, options.content)),
    loops: checkProfitLoops(options.content),
    payoutRuns: options.scenarios === undefined ? sweepPayouts(options.seed, options.content) : [],
  };
}

function duration(ms: number): string {
  if (ms < SECONDS_SHOWN_BELOW_MS) return `${Math.round(ms / MS_PER_SECOND)} s`;
  if (ms < HOURS_SHOWN_FROM_MS) return `${(ms / MS_PER_MINUTE).toFixed(1)} min`;
  return `${(ms / MS_PER_HOUR).toFixed(HOUR_DECIMALS)} h`;
}

function moment(at: Moment | undefined): string {
  if (at === undefined) return 'not reached';
  if (at.elapsedMs === at.activeMs) return duration(at.activeMs);
  return `${duration(at.activeMs)} active (${duration(at.elapsedMs)} elapsed)`;
}

const row = (cells: readonly string[]) => `| ${cells.join(' | ')} |`;

function table(header: readonly string[], rows: readonly (readonly string[])[]): string[] {
  return [row(header), row(header.map(() => '---')), ...rows.map(row)];
}

const schedules = (report: BalanceReport) => [
  ...new Set(report.runs.map((run) => run.scenario.name)),
];

const runsOf = (report: BalanceReport, schedule: string) =>
  report.runs.filter((run) => run.scenario.name === schedule);

function milestoneTable(runs: readonly BalanceRun[], unlockableTiers: readonly number[]): string[] {
  const goals = REPORTED_GOALS.map((goal) =>
    Array.of<string>(goal.label).concat(runs.map((run) => moment(run.goals[goal.goalId]))),
  );
  const tiers = unlockableTiers.map((tier) =>
    [`Tier ${tier} unlocked`].concat(runs.map((run) => moment(run.tiers[tier]))),
  );
  return table(['Milestone', ...runs.map((run) => run.scenario.policy)], [...goals, ...tiers]);
}

function milestones(report: BalanceReport): string[] {
  return [
    '## Milestones',
    '',
    'Times are active play; runs with offline gaps also show total elapsed time.',
    ...schedules(report).flatMap((schedule) =>
      ['', `### ${schedule}`, ''].concat(
        milestoneTable(runsOf(report, schedule), report.unlockableTiers),
      ),
    ),
  ];
}

const runLabel = (run: BalanceRun) => `${run.scenario.name}, ${run.scenario.policy}`;

function flagRow(run: BalanceRun, analysis: RunAnalysis): string[] {
  const { dominant, longestStall, stalled } = analysis;
  const stall = `${duration(longestStall.toActiveMs - longestStall.fromActiveMs)} from ${duration(longestStall.fromActiveMs)}`;
  return [
    runLabel(run),
    dominant === undefined ? 'none' : `${dominant.kind} (${dominant.percent.toFixed(0)}% of spend)`,
    stalled ? `**stall:** ${stall}` : stall,
  ];
}

function flags(report: BalanceReport): string[] {
  return [
    '## Flags',
    '',
    'A choice is dominant when one kind of purchase takes more than half of all spending. A stall is more than 30 minutes of active play without a purchase.',
    '',
    ...table(
      ['Run', 'Dominant choice', 'Longest wait between purchases'],
      report.runs.map((run) => flagRow(run, analyzeRun(run))),
    ),
  ];
}

function percent(value: number): string {
  if (value > 0 && value < SMALLEST_PERCENT_SHOWN) return `<${SMALLEST_PERCENT_SHOWN}%`;
  return `${value.toFixed(1)}%`;
}

function spendTable(run: BalanceRun): string[] {
  const rows = analyzeRun(run).spend.map((share) => [
    share.kind,
    String(share.purchases),
    percent(share.percent),
    Number.isFinite(share.medianPaybackMinutes)
      ? `${share.medianPaybackMinutes.toFixed(1)} min`
      : 'no immediate payback',
  ]);
  return table(['Purchase', 'Count', 'Share of spend', 'Median payback'], rows);
}

function spending(report: BalanceReport): string[] {
  return [
    '## Spending and payback',
    '',
    'Payback is price divided by the extra income per minute the purchase adds (wallet upgrades count taps at the run’s tap rate).',
    ...report.runs.flatMap((run) => ['', `### ${runLabel(run)}`, '', ...spendTable(run)]),
  ];
}

function allocationRow(run: BalanceRun): string[] {
  const { worth } = run.final;
  const markets = moneyCents(worth.positionsCents + worth.pendingDividendsCents);
  return [
    runLabel(run),
    moment(run.final),
    ...[worth.cashCents, worth.businessesCents, worth.propertiesCents, markets].map(
      formatMoneyCompact,
    ),
    formatMoneyCompact(worth.netWorthCents),
  ];
}

function hourlyNetWorth(report: BalanceReport): string[] {
  const hours = Math.max(...report.runs.map((run) => run.samples.length));
  const rows = Array.from({ length: hours }, (_unused, index) => [
    `${index + 1} h`,
    ...report.runs.map((run) => {
      const sample = run.samples[index];
      return sample === undefined ? '' : formatMoneyCompact(sample.worth.netWorthCents);
    }),
  ]);
  return table(['Active play', ...report.runs.map(runLabel)], rows);
}

function allocation(report: BalanceReport): string[] {
  return [
    '## Cash, allocation and net worth',
    '',
    'At the end of each run (it stops at $1B peak net worth or 40 hours of active play).',
    '',
    ...table(
      ['Run', 'Ended at', 'Cash', 'Businesses', 'Properties', 'Markets', 'Net worth'],
      report.runs.map(allocationRow),
    ),
    '',
    'Net worth after each hour of active play:',
    '',
    ...hourlyNetWorth(report),
  ];
}

function profitLoops(report: BalanceReport): string[] {
  const found = report.loops.filter((loop) => loop.bestNetCents >= 0n);
  const verdict =
    found.length === 0
      ? 'No buy/sell profit loop: every sale loses money against what was spent.'
      : `**Profit loop found** for ${found.map((loop) => loop.assetId).join(', ')}.`;
  return [
    '## Buy/sell profit loops',
    '',
    'Each asset is bought, then upgraded one level at a time on every track (for businesses, after a deposit into the treasury, then every unit the first stage allows), with no time passing. After every step it is sold, and the cash compared with the cash before buying.',
    '',
    verdict,
    '',
    ...table(
      ['Asset', 'Sale points tried', 'Best result of a buy, upgrade and sell'],
      report.loops.map((loop) => [
        `${loop.asset} ${loop.assetId}`,
        String(loop.sellPointsTried),
        formatMoneyExact(loop.bestNetCents),
      ]),
    ),
  ];
}

function introduction(report: BalanceReport): string[] {
  const rates = [...new Set(report.runs.map((run) => run.scenario.tapsPerSecond))].join(', ');
  return [
    '# Balance report',
    '',
    `Generated by \`bun run balance --seed ${report.seed}\`. The same seed always writes the same report.`,
    '',
    `- Economy version: ${report.economyVersion}`,
    `- Market seed: \`${report.seed}\``,
    `- Tap rate: ${rates} taps per second of active play`,
    '- Every run is ad-free: no Tap Boost and no ads.',
    '- Policies: **cheapestNext** buys the cheapest purchase that adds income; **bestPayback** waits for the purchase with the shortest payback; **saveForNextBusiness** saves for the cheapest unowned business it can buy, and otherwise buys the best payback.',
    '- Deep policies prioritize affordable stage upgrades, first flagship operating staff, and managers (manager style only), then follow the named purchase policy. Stages unlock capacity rather than immediate income.',
    '- Hands-on play chooses the best current price, stock mixes and locations, restocks empty locations, adjusts wash packages and membership prices, parks the food cart at the busiest spot with its most profitable menu, picks the most profitable coffee kiosk rush plan and bean grade and laundromat jumbo share and service level, sets the bakery bake level and takes wholesale orders that add profit, runs as many gym classes as the studios hold and sells the tier with the highest long-run fees, takes factory bulk orders that add profit and never retools, uses the forecast for member caps, and accepts contracts with positive incremental profit. Managers make only engine-defined daily decisions; they never accept contracts or move machines.',
    '- Main runs use five-second action steps; the payout sweep uses one-second steps. All purchases and operating changes go through the engine. Personal cash can fund treasury shortfalls.',
    '- Offline gaps are capped by the engine at 8 hours of credited time.',
  ];
}

export function renderBalanceReport(report: BalanceReport): string {
  return [
    ...introduction(report),
    '',
    ...milestones(report),
    '',
    ...flags(report),
    '',
    ...allocation(report),
    '',
    ...deepReport(report.runs),
    ...actionReport(report.runs),
    ...payoutReport(report.payoutRuns),
    ...spending(report),
    '',
    ...profitLoops(report),
    '',
  ].join('\n');
}
