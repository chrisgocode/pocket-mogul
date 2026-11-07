import { selectGoals } from '@/application/goalsView';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { Card } from '@/ui/Card';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/Typography';

import { GoalRow } from './GoalRow';
import { usePinGoal } from './usePinGoal';

export function GoalsScreen() {
  const content = getContent();
  const view = selectGoals(useGameSnapshot().state, content);
  const pin = usePinGoal();
  return (
    <Screen>
      <Card>
        <AppText variant="title">{`${view.reachedCount} of ${view.goals.length} badges`}</AppText>
        <AppText muted>
          Goals earn badges, not cash. Pin one you are working toward to Home.
        </AppText>
      </Card>
      <Card>
        {view.goals.map((goal) => (
          <GoalRow key={goal.id} goal={goal} onPin={pin} />
        ))}
      </Card>
    </Screen>
  );
}
