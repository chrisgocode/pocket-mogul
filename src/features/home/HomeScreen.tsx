import { selectIncomePerMinuteCents } from '@/application/cashView';
import { selectTapCard } from '@/application/tapCardView';
import { getContent } from '@/content';
import { formatMoneyExact, formatRatePerMinute } from '@/domain/money';
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
  const snapshot = useGameSnapshot();
  const content = getContent();
  const view = selectTapCard(snapshot, content);
  const playHaptic = useTapHaptics();
  const cash = formatMoneyExact(view.cashCents);
  const passive = formatRatePerMinute(selectIncomePerMinuteCents(snapshot, content), 'full');
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
        <AppText muted>
          {formatMoneyExact(view.perTapCents)} per tap · {passive} net passive
        </AppText>
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
