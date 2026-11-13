import type { GoalsView, GoalView } from '@/application/goalsView';
import { formatMoneyCompact } from '@/domain/money';

export function rewardText(goal: GoalView): string | undefined {
  return goal.rewardCents === 0n ? undefined : formatMoneyCompact(goal.rewardCents);
}

export function claimAllLabel(view: GoalsView): string {
  const count = view.claimableIds.length;
  const rewards = count === 1 ? '1 reward' : `${count} rewards`;
  return `Claim ${rewards} · ${formatMoneyCompact(view.claimableCents)}`;
}
