import { selectRank } from '@/application/rankView';
import { getContent } from '@/content';
import { formatMoneyCompact } from '@/domain/money';
import { useGameSnapshot } from '@/features/game/GameContext';
import { DetailLine } from '@/ui/DetailLine';

export function RankLines() {
  const rank = selectRank(useGameSnapshot().state, getContent());
  if (rank === undefined) return null;
  const next =
    rank.next === undefined
      ? 'Top rank reached'
      : `${rank.next.title} at ${formatMoneyCompact(rank.next.thresholdCents)} peak net worth`;
  return (
    <>
      <DetailLine label="Rank" value={rank.title} emphasis />
      <DetailLine label="Next rank" value={next} />
    </>
  );
}
