import { selectBriefing } from '@/application/briefingView';
import { formatMoneyCompact } from '@/domain/money';
import { useGameSnapshot } from '@/features/game/GameContext';
import { GoalBadge } from '@/features/goals/GoalBadge';
import { ListRow } from '@/ui/ListRow';

import { briefingSummaryText, briefingSummaryTitle } from './briefingText';
import { useClaimBriefing } from './useClaimBriefing';

export function BriefingRow() {
  const briefing = selectBriefing(useGameSnapshot().state);
  const claim = useClaimBriefing();
  if (briefing.status === 'hidden') return null;
  const title = briefingSummaryTitle(briefing);
  const summary = briefingSummaryText(briefing);
  if (briefing.claimableCents === 0n)
    return (
      <ListRow
        leading={<GoalBadge reached={briefing.bonus === 'claimed'} />}
        title={title}
        subtitle={summary}
        accessibilityLabel={`${title} done, ${summary}`}
      />
    );
  const reward = formatMoneyCompact(briefing.claimableCents);
  return (
    <ListRow
      leading={<GoalBadge reached />}
      title={title}
      subtitle={summary}
      value={reward}
      detail="Claim"
      accessibilityLabel={`${title} done, ${summary}, claim ${reward}`}
      onPress={claim}
    />
  );
}
