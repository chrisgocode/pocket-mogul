import type { Content } from '@/content';
import type { GameState } from '@/domain/gameState';
import type { MoneyCents } from '@/domain/money';
import { rankStanding } from '@/domain/rank';

export type RankView = {
  readonly title: string;
  readonly next: { readonly title: string; readonly thresholdCents: MoneyCents } | undefined;
};

export function selectRank(state: GameState, content: Content): RankView | undefined {
  const standing = rankStanding(state.peakNetWorthCents, content.ranks);
  if (standing === undefined) return undefined;
  const { current, next } = standing;
  return {
    title: current.title,
    next: next === undefined ? undefined : { title: next.title, thresholdCents: next.threshold },
  };
}

const PROGRESS_STEPS = 1000n;

export function selectRankProgress(state: GameState, content: Content): number {
  const standing = rankStanding(state.peakNetWorthCents, content.ranks);
  if (standing === undefined) return 0;
  const { current, next } = standing;
  if (next === undefined || next.threshold <= current.threshold) return 1;
  const climbed = state.peakNetWorthCents - current.threshold;
  const steps = (climbed * PROGRESS_STEPS) / (next.threshold - current.threshold);
  return Number(steps) / Number(PROGRESS_STEPS);
}
