import { TUTORIAL_STEPS } from '@/domain/tutorial';
import { TutorialHint } from '@/features/tutorial/TutorialHint';
import { Screen } from '@/ui/Screen';

import { HomeOverview } from './HomeOverview';
import { HomeDecisions } from './HomeDecisions';
import { HomeAssets } from './HomeAssets';
import { PinnedGoalCard } from './PinnedGoalCard';
import { TapEarnings } from './TapEarnings';

export function HomeScreen() {
  return (
    <Screen tone="earn">
      <PinnedGoalCard />
      <HomeOverview />
      <HomeDecisions />
      <TutorialHint steps={TUTORIAL_STEPS} />
      <TapEarnings />
      <HomeAssets />
    </Screen>
  );
}
