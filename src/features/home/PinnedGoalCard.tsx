import { useRouter } from 'expo-router';

import { selectGoals, selectPinnedGoal } from '@/application/goalsView';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { GoalBadge } from '@/features/goals/GoalBadge';
import { claimAllLabel } from '@/features/goals/goalFormat';
import { ListRow } from '@/ui/ListRow';

export function PinnedGoalCard() {
  const router = useRouter();
  const state = useGameSnapshot().state;
  const content = getContent();
  const pinned = selectPinnedGoal(state, content);
  const goals = selectGoals(state, content);
  const next = goals.goals.find((goal) => goal.status === 'open');
  const openGoals = () => router.push('/goals');
  if (goals.claimableIds.length > 0)
    return (
      <ListRow
        title="Goal rewards to claim"
        subtitle={claimAllLabel(goals)}
        leading={<GoalBadge reached />}
        accessibilityLabel={`${claimAllLabel(goals)}, open Goals`}
        onPress={openGoals}
      />
    );
  if (pinned === undefined)
    return (
      <ListRow
        title={next?.title ?? 'Goals'}
        subtitle={`${goals.reachedCount} / ${goals.goals.length} badges`}
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
