import { selectTapCard } from '@/application/tapCardView';
import { getContent } from '@/content';
import { useGame, useGameSnapshot } from '@/features/game/GameContext';
import { useTutorial } from '@/features/tutorial/useTutorial';
import { Card } from '@/ui/Card';

import { TapBoostControl } from './TapBoostControl';
import { TapCard } from './TapCard';
import { useTapHaptics } from './useTapHaptics';
import { walletArtwork } from './walletArtwork';
import { WalletUpgrade } from './WalletUpgrade';

export function TapEarnings() {
  const tutorial = useTutorial();
  const game = useGame();
  const view = selectTapCard(useGameSnapshot(), getContent());
  const playHaptic = useTapHaptics();
  const tap = () => {
    game.tap();
    playHaptic();
  };
  return (
    <>
      <Card accessibilityLabel="Tap earnings">
        <TapCard
          perTapCents={view.perTapCents}
          walletLevel={view.walletLevel}
          boosted={view.boosted}
          artwork={walletArtwork(view.artworkStage, view.skin)}
          highlight={tutorial.isOn('tap') ? 'tutorial' : 'none'}
          onTap={tap}
        />
        <TapBoostControl />
      </Card>
      <WalletUpgrade tapCard={view} highlighted={tutorial.isOn('upgradeWallet')} />
    </>
  );
}
