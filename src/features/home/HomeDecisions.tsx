import { selectHomeAttention } from '@/application/homeAttention';
import { selectHomeGrowth } from '@/application/homeGrowth';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { AttentionCard } from './AttentionCard';
import { GrowthAction } from './GrowthAction';
export function HomeDecisions() {
  const snapshot = useGameSnapshot();
  const content = getContent();
  const attention = selectHomeAttention(snapshot, content);
  if (attention.length > 0) return <AttentionCard items={attention} />;
  return <GrowthAction growth={selectHomeGrowth(snapshot, content)} />;
}
