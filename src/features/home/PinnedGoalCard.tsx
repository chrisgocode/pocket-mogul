import { useRouter } from 'expo-router';

import { selectPinnedGoal } from '@/application/goalsView';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { GoalBadge } from '@/features/goals/GoalBadge';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';

export function PinnedGoalCard() {
  const router = useRouter();
  const pinned = selectPinnedGoal(useGameSnapshot().state, getContent());
  const openGoals = () => router.push('/goals');
  return (
    <Card>
      {pinned === undefined ? (
        <ListRow
          title="Pin a goal"
          subtitle="Choose a goal to track here"
          accessibilityLabel="Pin a goal, open Goals"
          onPress={openGoals}
        />
      ) : (
        <ListRow
          leading={<GoalBadge reached={false} />}
          title={pinned.title}
          subtitle={pinned.progressLabel}
          accessibilityLabel={`Pinned goal, ${pinned.title}, ${pinned.progressLabel}`}
          onPress={openGoals}
        />
      )}
    </Card>
  );
}
