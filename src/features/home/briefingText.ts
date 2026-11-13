import type { BriefingView } from '@/application/briefingView';
import { formatMoneyCompact } from '@/domain/money';

type Shown = Extract<BriefingView, { status: 'shown' }>;

export function briefingBonusText(briefing: Shown): string {
  const bonus = formatMoneyCompact(briefing.bonusCents);
  if (briefing.bonus === 'claimed') return `All done. ${bonus} bonus claimed. New tasks tomorrow.`;
  if (briefing.bonus === 'claimable') return `All done. ${bonus} bonus ready.`;
  return `Finish all ${briefing.tasks.length} for a ${bonus} bonus. New tasks every day.`;
}
