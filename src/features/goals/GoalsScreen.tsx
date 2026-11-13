import { selectGoals } from '@/application/goalsView';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { useSegment } from '@/ui/state/useSegment';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/Typography';

import { claimAllLabel } from './goalFormat';
import { GoalRow } from './GoalRow';
import { useClaimGoals } from './useClaimGoals';
import { usePinGoal } from './usePinGoal';

const FILTERS = ['All', 'In progress', 'Earned'] as const;
export function GoalsScreen() {
  const content = getContent();
  const view = selectGoals(useGameSnapshot().state, content);
  const pin = usePinGoal();
  const claim = useClaimGoals();
  const filter = useSegment<string>('All');
  const goals = view.goals.filter(
    (goal) =>
      filter.selected === 'All' ||
      (filter.selected === 'Earned' ? goal.status !== 'open' : goal.status === 'open'),
  );
  return (
    <Screen>
      <Card>
        <AppText variant="display">{`${view.reachedCount} of ${view.goals.length} badges`}</AppText>
        {view.claimableIds.length === 0 ? null : (
          <Button label={claimAllLabel(view)} onPress={() => claim(view.claimableIds)} />
        )}
      </Card>
      <SegmentedControl
        options={FILTERS.map((label) => ({ value: label, label }))}
        selected={filter.selected}
        onSelect={filter.select}
      />
      <Card>
        {goals.map((goal) => (
          <GoalRow key={goal.id} goal={goal} onPin={pin} onClaim={claim} />
        ))}
      </Card>
    </Screen>
  );
}
