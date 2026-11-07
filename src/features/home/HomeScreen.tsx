import { selectPassiveIncomePerMinuteCents } from '@/application/cashView';
import { selectTapCard } from '@/application/tapCardView';
import { getContent } from '@/content';
import { TUTORIAL_STEPS } from '@/domain/tutorial';
import { useGame, useGameSnapshot } from '@/features/game/GameContext';
import { TutorialHint } from '@/features/tutorial/TutorialHint';
import { useTutorial } from '@/features/tutorial/useTutorial';
import { Screen } from '@/ui/Screen';

import { HomeCashCard } from './HomeCashCard';
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
    <Screen>
      <HomeCashCard
        cashCents={view.cashCents}
        perTapCents={view.perTapCents}
        passivePerMinuteCents={selectPassiveIncomePerMinuteCents(snapshot, content)}
      />
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
      <PinnedGoalCard />
    </Screen>
  );
}
