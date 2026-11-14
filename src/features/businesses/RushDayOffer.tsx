import { selectRushDay } from '@/application/rushDayView';
import { getContent } from '@/content';
import { AdRewardButton } from '@/features/adRewards/AdRewardButton';
import { useGameSnapshot } from '@/features/game/GameContext';
import { ListRow } from '@/ui/ListRow';

import { dayCount } from './businessFormat';

export function RushDayOffer({ businessId }: { businessId: string }) {
  const view = selectRushDay(useGameSnapshot(), { businessId, content: getContent() });
  const boost = `${view.multiplier}× profit`;
  if (view.status === 'running')
    return (
      <ListRow
        title="Rush day running"
        subtitle={`${boost} for this business`}
        value={`${dayCount(view.daysLeft)} left`}
      />
    );
  return (
    <AdRewardButton
      offer={{ kind: 'rush_day', businessId }}
      name="Rush day"
      reward={`${boost} through the next business day`}
    />
  );
}
