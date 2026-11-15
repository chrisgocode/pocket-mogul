import { selectTapCard } from '@/application/tapCardView';
import { getContent } from '@/content';
import { useGame, useGameSnapshot } from '@/features/game/GameContext';
import { useTutorial } from '@/features/tutorial/useTutorial';

import { TapCard } from './TapCard';
import { useTapHaptics } from './useTapHaptics';
import { walletArtwork } from './walletArtwork';

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
    <TapCard
      perTapCents={view.perTapCents}
      boosted={view.boosted}
      artwork={walletArtwork(view.artworkStage, view.skin)}
      highlight={tutorial.isOn('tap') ? 'tutorial' : 'none'}
      onTap={tap}
    />
  );
}
