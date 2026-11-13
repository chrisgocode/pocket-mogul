import type { BriefingTaskView } from '@/application/briefingView';
import { formatMoneyCompact } from '@/domain/money';
import { GoalBadge } from '@/features/goals/GoalBadge';
import { ListRow } from '@/ui/ListRow';

const REWARD_NOTES: Readonly<Record<BriefingTaskView['status'], string>> = {
  open: 'Reward',
  claimable: 'Ready',
  claimed: 'Claimed',
};

const SPOKEN: Readonly<Record<BriefingTaskView['status'], string>> = {
  open: 'in progress',
  claimable: 'done, reward ready',
  claimed: 'done, reward claimed',
};

export function BriefingTaskRow({ task }: { task: BriefingTaskView }) {
  const reward = formatMoneyCompact(task.rewardCents);
  return (
    <ListRow
      leading={<GoalBadge reached={task.status !== 'open'} />}
      title={task.title}
      subtitle={task.progressLabel}
      value={reward}
      detail={REWARD_NOTES[task.status]}
      accessibilityLabel={`${task.title}, ${task.progressLabel}, ${SPOKEN[task.status]}, ${reward}`}
    />
  );
}
