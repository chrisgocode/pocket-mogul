import { TUTORIAL_STEPS } from '@/domain/tutorial';
import { TutorialHint } from '@/features/tutorial/TutorialHint';
import { Screen } from '@/ui/Screen';

import { HomeOverview } from './HomeOverview';
import { HomeDecisions } from './HomeDecisions';
import { HomeAssets } from './HomeAssets';
import { BriefcaseOffer } from './BriefcaseOffer';
import { BriefingCard } from './BriefingCard';
import { BriefingRow } from './BriefingRow';
import { PinnedGoalCard } from './PinnedGoalCard';
import { ShowpieceCard } from './ShowpieceCard';
import { TapEarnings } from './TapEarnings';

export function HomeScreen() {
  return (
    <Screen tone="earn">
      <PinnedGoalCard />
      <BriefingRow />
      <HomeOverview />
      <HomeDecisions />
      <TutorialHint steps={TUTORIAL_STEPS} />
      <TapEarnings />
      <BriefingCard />
      <BriefcaseOffer />
      <ShowpieceCard />
      <HomeAssets />
    </Screen>
  );
}
