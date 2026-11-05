import { selectTapCard } from '@/application/tapCardView';
import { getContent } from '@/content';
import { formatMoneyExact } from '@/domain/money';
import { useGame, useGameSnapshot } from '@/features/game/GameContext';
import { Card } from '@/ui/Card';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/Typography';

import { TapCard } from './TapCard';
import { useTapHaptics } from './useTapHaptics';
import { walletArtwork } from './walletArtwork';
import { WalletUpgrade } from './WalletUpgrade';

export function HomeScreen() {
  const game = useGame();
  const view = selectTapCard(useGameSnapshot(), getContent());
  const playHaptic = useTapHaptics();
  const cash = formatMoneyExact(view.cashCents);
  const tap = () => {
    game.tap();
    playHaptic();
  };
  return (
    <Screen>
      <Card>
        <AppText variant="caption" muted>
          Cash
        </AppText>
        <AppText variant="display" accessibilityLabel={`Cash ${cash}`}>
          {cash}
        </AppText>
        <AppText muted>{formatMoneyExact(view.perTapCents)} per tap · $0.00/min passive</AppText>
      </Card>
      <TapCard
        perTapCents={view.perTapCents}
        walletLevel={view.walletLevel}
        artwork={walletArtwork(view.artworkStage)}
        onTap={tap}
      />
      <WalletUpgrade tapCard={view} />
    </Screen>
  );
}
