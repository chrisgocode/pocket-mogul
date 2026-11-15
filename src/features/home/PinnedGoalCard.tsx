import { useRouter } from 'expo-router';

import { selectGoals, selectPinnedGoal } from '@/application/goalsView';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { GoalBadge } from '@/features/goals/GoalBadge';
import { ListRow } from '@/ui/ListRow';

import { questRow } from './questRow';

export function PinnedGoalCard() {
  const router = useRouter();
  const state = useGameSnapshot().state;
  const content = getContent();
  const quest = questRow(selectGoals(state, content), selectPinnedGoal(state, content));
  return (
    <ListRow
      variant="card"
      leading={<GoalBadge reached={quest.reached} />}
      title={quest.title}
      subtitle={quest.subtitle}
      value="›"
      accessibilityLabel={quest.accessibilityLabel}
      onPress={() => router.push('/goals')}
    />
  );
}
