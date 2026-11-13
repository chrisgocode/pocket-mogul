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
