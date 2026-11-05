import type { TapCardView } from '@/application/tapCardView';
import { selectWalletUpgrade, type AvailableWalletUpgrade } from '@/application/walletUpgradeView';
import { getContent } from '@/content';
import { formatMoneyExact, moneyCents } from '@/domain/money';
import type { ConfirmationLine } from '@/ui/ConfirmationDetails';
import { ConfirmationSheet } from '@/ui/ConfirmationSheet';

import { useWalletUpgrade } from './useWalletUpgrade';
import { WalletUpgradeControl } from './WalletUpgradeControl';

function confirmationLines(upgrade: AvailableWalletUpgrade): ConfirmationLine[] {
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
  const reviewed = confirmation.status === 'closed' ? undefined : confirmation.subject;
  return (
    <>
      <WalletUpgradeControl upgrade={upgrade} onReview={review} />
      <ConfirmationSheet
        confirmation={confirmation}
        title="Upgrade wallet"
        lines={reviewed === undefined ? [] : confirmationLines(reviewed)}
        confirmLabel={
          reviewed === undefined
            ? 'Confirm upgrade'
            : `Confirm upgrade · ${formatMoneyExact(reviewed.priceCents)}`
        }
        onConfirm={() => void confirm()}
        onCancel={close}
      />
    </>
  );
}
