import { selectTapCard } from '@/application/tapCardView';
import { getContent } from '@/content';
import { TUTORIAL_STEPS } from '@/domain/tutorial';
import { useGame, useGameSnapshot } from '@/features/game/GameContext';
import { TutorialHint } from '@/features/tutorial/TutorialHint';
import { useTutorial } from '@/features/tutorial/useTutorial';
import { Screen } from '@/ui/Screen';

import { HomeOverview } from './HomeOverview';
import { AttentionCard } from './AttentionCard';
import { GrowthAction } from './GrowthAction';
import { HomeAssets } from './HomeAssets';
import { PinnedGoalCard } from './PinnedGoalCard';
import { TapBoostCard } from './TapBoostCard';
import { TapCard } from './TapCard';
import { useTapHaptics } from './useTapHaptics';
import { walletArtwork } from './walletArtwork';
import { WalletUpgrade } from './WalletUpgrade';

export function HomeScreen() {
  const game = useGame();
  const snapshot = useGameSnapshot();
  const content = getContent();
  const view = selectTapCard(snapshot, content);
  const playHaptic = useTapHaptics();
  const tutorial = useTutorial();
  const tap = () => {
    game.tap();
    playHaptic();
  };
  return (
    <Screen tone="earn">
      <PinnedGoalCard />
      <HomeOverview />
      <AttentionCard />
      <TutorialHint steps={TUTORIAL_STEPS} />
      <TapCard
        perTapCents={view.perTapCents}
        walletLevel={view.walletLevel}
        boosted={view.boosted}
        artwork={walletArtwork(view.artworkStage)}
        highlight={tutorial.isOn('tap') ? 'tutorial' : 'none'}
        onTap={tap}
      />
      <TapBoostCard />
      <WalletUpgrade tapCard={view} highlighted={tutorial.isOn('upgradeWallet')} />
      <HomeAssets />
      <GrowthAction />
    </Screen>
  );
}
