import type { MoneyCents } from './money';

export type Rank = {
  readonly id: string;
  readonly title: string;
  readonly threshold: MoneyCents;
};

export type RankStanding = {
  readonly current: Rank;
  readonly next: Rank | undefined;
};

export function rankStanding(
  peakNetWorthCents: MoneyCents,
  ranks: readonly Rank[],
): RankStanding | undefined {
  const held = ranks.filter((rank) => peakNetWorthCents >= rank.threshold);
  const current = held[held.length - 1];
  if (current === undefined) return undefined;
  return { current, next: ranks[held.length] };
}
