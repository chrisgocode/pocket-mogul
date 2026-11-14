import type { Content } from '@/content';
import { cashPerMinuteCents } from '@/domain/business/core';
import { formatMoneyCompact, moneyCents } from '@/domain/money';

import { businessEconomy } from '@/application/economy';

import type { BalanceRun } from './simulation';

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;
const HOUR_DECIMALS = 1;

export type AdCeiling = {
  readonly run: string;
  readonly incomePerMinuteCents: bigint;
  readonly briefcaseCents: bigint;
  readonly rushDaysCents: bigint;
  readonly offlineDoubleCents: bigint;
};

function businessRates(run: BalanceRun, content: Content): readonly bigint[] {
  const { catalog, rules } = businessEconomy(content);
  return run.businesses.flatMap((owned) => {
    const definition = catalog.find((each) => each.id === owned.definitionId);
    return definition === undefined ? [] : [cashPerMinuteCents(owned, { definition, rules })];
  });
}

function largest(rates: readonly bigint[], count: number): readonly bigint[] {
  return Array.from({ length: count }).reduce<{ kept: bigint[]; rest: readonly bigint[] }>(
    (picked) => {
      if (picked.rest.length === 0) return picked;
      const top = picked.rest.reduce((best, rate) => (rate > best ? rate : best));
      const at = picked.rest.indexOf(top);
      return {
        kept: [...picked.kept, top],
        rest: picked.rest.filter((_rate, index) => index !== at),
      };
    },
    { kept: [], rest: rates },
  ).kept;
}

export function adCeiling(run: BalanceRun, content: Content): AdCeiling {
  const rates = businessRates(run, content);
  const { rules } = businessEconomy(content);
  const { dailyLimits, rushDays, rushProfitBps, briefcaseMinutes } = content.adRewards;
  const perMinute = rates.reduce((total, rate) => total + rate, 0n);
  const rushMinutes = BigInt(((1 + rushDays) * rules.dayMs) / MS_PER_MINUTE);
  const extraBps = BigInt(rushProfitBps) - BASIS_POINTS;
  const rushed = largest(rates, dailyLimits.rush_day).reduce((total, rate) => total + rate, 0n);
  return {
    run: `${run.scenario.name}, ${run.scenario.policy}`,
    incomePerMinuteCents: perMinute,
    briefcaseCents: perMinute * BigInt(briefcaseMinutes),
    rushDaysCents: (rushed * rushMinutes * extraBps) / BASIS_POINTS,
    offlineDoubleCents: perMinute * BigInt(content.economy.time.offlineCapMs / MS_PER_MINUTE),
  };
}

const BASIS_POINTS = 10_000n;

const money = (cents: bigint) => formatMoneyCompact(moneyCents(cents));

function hoursOfIncome(ceiling: AdCeiling): string {
  if (ceiling.incomePerMinuteCents === 0n) return 'n/a';
  const total = ceiling.briefcaseCents + ceiling.rushDaysCents + ceiling.offlineDoubleCents;
  const minutes = Number(total / ceiling.incomePerMinuteCents);
  return `${(minutes / MINUTES_PER_HOUR).toFixed(HOUR_DECIMALS)} h`;
}

export function adReport(ceilings: readonly AdCeiling[]): string[] {
  return [
    '## Rewarded ads',
    '',
    'The runs above watch no ads. This is the most a player could add in one day at the end of each run, from business income alone: the daily briefcase, every rush day on the best-earning businesses for the longest a rush can last, and one doubled return after a full offline cap. Ending an incident, redrawing lots and clearing a takeover lock pay no cash. A player who returns after a full cap more than once a day can double each return.',
    '',
    '| Run | Business income per minute | Daily briefcase | Rush days | One doubled return | Total, as hours of income |',
    '| --- | --- | --- | --- | --- | --- |',
    ...ceilings.map(
      (ceiling) =>
        `| ${ceiling.run} | ${money(ceiling.incomePerMinuteCents)} | ${money(ceiling.briefcaseCents)} | ${money(ceiling.rushDaysCents)} | ${money(ceiling.offlineDoubleCents)} | ${hoursOfIncome(ceiling)} |`,
    ),
  ];
}
