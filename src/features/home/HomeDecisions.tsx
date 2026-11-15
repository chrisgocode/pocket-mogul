import { selectHomeAttention } from '@/application/homeAttention';
import { selectHomeGrowth } from '@/application/homeGrowth';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { EmptyState } from '@/ui/EmptyState';
import { AppText } from '@/ui/Typography';

import { AttentionRow } from './AttentionRow';
import { GrowthAction } from './GrowthAction';

export function HomeDecisions({ onLeave }: { onLeave: () => void }) {
  const snapshot = useGameSnapshot();
  const content = getContent();
  const attention = selectHomeAttention(snapshot, content);
  const growth = selectHomeGrowth(snapshot, content);
  if (attention.length === 0 && growth === undefined)
    return <EmptyState title="All clear" message="Nothing needs you right now." />;
  return (
    <>
      <AppText variant="title" accessibilityRole="header">
        {attention.length > 0 ? `Needs attention · ${attention.length}` : 'Next step'}
      </AppText>
      {attention.map((item) => (
        <AttentionRow key={item.title} item={item} onLeave={onLeave} />
      ))}
      {attention.length === 0 ? <GrowthAction growth={growth} onLeave={onLeave} /> : null}
    </>
  );
}
