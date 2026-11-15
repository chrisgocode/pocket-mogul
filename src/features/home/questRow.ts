import type { GoalsView, selectPinnedGoal } from '@/application/goalsView';
import { claimAllLabel } from '@/features/goals/goalFormat';

export type QuestRow = {
  readonly title: string;
  readonly subtitle: string;
  readonly reached: boolean;
  readonly accessibilityLabel: string;
};

export function questRow(goals: GoalsView, pinned: ReturnType<typeof selectPinnedGoal>): QuestRow {
  if (goals.claimableIds.length > 0)
    return {
      title: 'Goal rewards to claim',
      subtitle: claimAllLabel(goals),
      reached: true,
      accessibilityLabel: `${claimAllLabel(goals)}, open Goals`,
    };
  if (pinned === undefined)
    return {
      title: goals.goals.find((goal) => goal.status === 'open')?.title ?? 'Goals',
      subtitle: `${goals.reachedCount} / ${goals.goals.length} badges`,
      reached: false,
      accessibilityLabel: 'Pin a goal, open Goals',
    };
  return {
    title: pinned.title,
    subtitle: pinned.progressLabel,
    reached: false,
    accessibilityLabel: `Pinned goal, ${pinned.title}, ${pinned.progressLabel}`,
  };
}
