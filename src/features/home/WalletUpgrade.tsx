import type { TapCardView } from '@/application/tapCardView';
import { selectWalletUpgrade, type WalletUpgradeView } from '@/application/walletUpgradeView';
import { getContent } from '@/content';
import { formatMoneyExact, moneyCents } from '@/domain/money';
import type { ConfirmationLine } from '@/ui/ConfirmationDetails';
import { ConfirmationSheet } from '@/ui/ConfirmationSheet';

import { useWalletUpgrade } from './useWalletUpgrade';
import { WalletUpgradeControl } from './WalletUpgradeControl';

function confirmationLines(
  upgrade: Extract<WalletUpgradeView, { status: 'available' }>,
): ConfirmationLine[] {
  return [
    { label: 'Cash change', value: formatMoneyExact(moneyCents(0n - upgrade.priceCents)) },
    {
      label: 'Earnings per tap',
      value: `${formatMoneyExact(upgrade.payoutCents)} → ${formatMoneyExact(upgrade.nextPayoutCents)}`,
    },
    { label: 'Wallet level', value: `${upgrade.level} → ${upgrade.level + 1}` },
  ];
}

export function WalletUpgrade({ tapCard }: { tapCard: TapCardView }) {
  const upgrade = selectWalletUpgrade(tapCard, getContent());
  const { confirmation, review, close, confirm } = useWalletUpgrade();
  return (
    <>
      <WalletUpgradeControl upgrade={upgrade} onPress={review} />
      {upgrade.status === 'available' ? (
        <ConfirmationSheet
          confirmation={confirmation}
          title="Upgrade wallet"
          lines={confirmationLines(upgrade)}
          confirmLabel={`Confirm upgrade · ${formatMoneyExact(upgrade.priceCents)}`}
          onConfirm={() => void confirm(upgrade.level)}
          onCancel={close}
        />
      ) : null}
    </>
  );
}
