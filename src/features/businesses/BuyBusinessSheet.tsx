import type { BusinessOffer } from '@/application/businessesView';
import { formatMoneyExact, moneyCents } from '@/domain/money';
import type { ConfirmationLine } from '@/ui/ConfirmationDetails';
import { ConfirmationSheet } from '@/ui/ConfirmationSheet';
import type { Confirmation } from '@/ui/state/useConfirmation';

import { formatPerDay } from './businessFormat';

function confirmationLines(offer: BusinessOffer): ConfirmationLine[] {
  return [
    { label: 'Cash change', value: formatMoneyExact(moneyCents(0n - offer.business.price)) },
    { label: 'Profit', value: `+${formatPerDay(offer.profitPerDayCents)} to its treasury` },
    { label: 'You will own', value: offer.business.name },
  ];
}

export function BuyBusinessSheet({
  confirmation,
  onConfirm,
  onCancel,
}: {
  confirmation: Confirmation<BusinessOffer>;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const reviewed = confirmation.status === 'closed' ? undefined : confirmation.subject;
  return (
    <ConfirmationSheet
      confirmation={confirmation}
      title={reviewed === undefined ? 'Buy business' : `Buy ${reviewed.business.name}`}
      lines={reviewed === undefined ? [] : confirmationLines(reviewed)}
      confirmLabel={
        reviewed === undefined
          ? 'Confirm purchase'
          : `Confirm purchase · ${formatMoneyExact(reviewed.business.price)}`
      }
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
