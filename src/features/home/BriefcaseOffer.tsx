import { selectBriefcaseCents } from '@/application/adOfferView';
import { getContent } from '@/content';
import { formatMoneyCompact } from '@/domain/money';
import { AdRewardButton } from '@/features/adRewards/AdRewardButton';
import { useGameSnapshot } from '@/features/game/GameContext';

export function BriefcaseOffer() {
  const content = getContent();
  const cents = selectBriefcaseCents(useGameSnapshot(), content);
  return (
    <AdRewardButton
      offer={{ kind: 'briefcase' }}
      name="Daily briefcase"
      reward={`${formatMoneyCompact(cents)} briefcase`}
      detail={`${content.adRewards.briefcaseMinutes} minutes of your income`}
    />
  );
}
