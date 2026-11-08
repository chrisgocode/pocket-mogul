import { useRouter } from 'expo-router';

import { selectPinnedGoal } from '@/application/goalsView';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { GoalBadge } from '@/features/goals/GoalBadge';
import { ListRow } from '@/ui/ListRow';

export function PinnedGoalCard() {
  const router = useRouter();
  const pinned = selectPinnedGoal(useGameSnapshot().state, getContent());
  const openGoals = () => router.push('/goals');
  if (pinned === undefined)
    return (
      <ListRow
        title="Goals"
        subtitle="Goals & achievements"
        leading={<GoalBadge reached={false} />}
        accessibilityLabel="Pin a goal, open Goals"
        onPress={openGoals}
      />
    );
  return (
    <ListRow
      leading={<GoalBadge reached={false} />}
      title={pinned.title}
      subtitle={pinned.progressLabel}
      accessibilityLabel={`Pinned goal, ${pinned.title}, ${pinned.progressLabel}`}
      onPress={openGoals}
    />
  );
}
