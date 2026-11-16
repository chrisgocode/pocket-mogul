import { selectTapCard } from '@/application/tapCardView';
import { selectWalletUpgrade, type AvailableWalletUpgrade } from '@/application/walletUpgradeView';
import { getContent } from '@/content';
import { formatMoneyExact } from '@/domain/money';
import { useGameSnapshot } from '@/features/game/GameContext';
import { useQuickBuy, type QuickPurchase } from '@/features/game/useQuickBuy';
import { useTutorial } from '@/features/tutorial/useTutorial';

import { WalletUpgradeControl } from './WalletUpgradeControl';

function walletPurchase(upgrade: AvailableWalletUpgrade): QuickPurchase {
  return {
    command: { type: 'UpgradeWallet', fromLevel: upgrade.level },
    gained: `Wallet Lv ${upgrade.level + 1} · ${formatMoneyExact(upgrade.nextPayoutCents)} per tap`,
  };
}

export function WalletUpgrade() {
  const content = getContent();
  const upgrade = selectWalletUpgrade(selectTapCard(useGameSnapshot(), content), content);
  const tutorial = useTutorial();
  const buy = useQuickBuy();
  return (
    <WalletUpgradeControl
      upgrade={upgrade}
      highlighted={tutorial.isOn('upgradeWallet')}
      onBuy={(available) => buy(walletPurchase(available))}
    />
  );
}
