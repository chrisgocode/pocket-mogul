import { selectBriefcaseCents } from '@/application/adOfferView';
import { getContent } from '@/content';
import { formatMoneyCompact } from '@/domain/money';
import { AdRewardButton } from '@/features/adRewards/AdRewardButton';
import { useGameSnapshot } from '@/features/game/GameContext';
import { AppText } from '@/ui/Typography';

export function BriefcaseOffer() {
  const content = getContent();
  const cents = selectBriefcaseCents(useGameSnapshot(), content);
  return (
    <>
      <AppText variant="title" accessibilityRole="header">
        Daily briefcase
      </AppText>
      <AppText variant="display">{formatMoneyCompact(cents)}</AppText>
      <AdRewardButton
        offer={{ kind: 'briefcase' }}
        name="Daily briefcase"
        reward={`${formatMoneyCompact(cents)} briefcase`}
        detail={`${content.adRewards.briefcaseMinutes} minutes of your income`}
      />
    </>
  );
}
