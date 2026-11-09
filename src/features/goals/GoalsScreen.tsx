import { selectGoals } from '@/application/goalsView';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { Card } from '@/ui/Card';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { useSegment } from '@/ui/state/useSegment';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/Typography';

import { GoalRow } from './GoalRow';
import { usePinGoal } from './usePinGoal';

const FILTERS = ['All', 'In progress', 'Earned'] as const;
export function GoalsScreen() {
  const content = getContent();
  const view = selectGoals(useGameSnapshot().state, content);
  const pin = usePinGoal();
  const filter = useSegment<string>('All');
  const goals = view.goals.filter(
    (goal) =>
      filter.selected === 'All' ||
      (filter.selected === 'Earned' ? goal.status === 'reached' : goal.status !== 'reached'),
  );
  return (
    <Screen>
      <Card>
        <AppText variant="display">{`${view.reachedCount} of ${view.goals.length} badges`}</AppText>
      </Card>
      <SegmentedControl
        options={FILTERS.map((label) => ({ value: label, label }))}
        selected={filter.selected}
        onSelect={filter.select}
      />
      <Card>
        {goals.map((goal) => (
          <GoalRow key={goal.id} goal={goal} onPin={pin} />
        ))}
      </Card>
    </Screen>
  );
}
