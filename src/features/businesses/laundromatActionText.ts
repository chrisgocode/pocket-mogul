import type { AvailablePickup } from '@/application/laundromatView';
import { formatMoneyExact } from '@/domain/money';
import type { ActionSheetText } from '@/features/game/ActionSheet';
import { formatCashChange } from '@/features/game/priceFormat';

import { profitChange, spent } from './businessFormat';

export function pickupText(pickup: AvailablePickup): ActionSheetText {
  return {
    title: 'Add pickup and delivery',
    lines: [
      { label: 'Treasury change', value: formatCashChange(spent(pickup.priceCents)) },
      { label: 'Profit', value: profitChange(pickup.profitCents, pickup.nextProfitCents) },
      { label: 'Customers', value: 'More customers every day' },
    ],
    confirmLabel: `Confirm · ${formatMoneyExact(pickup.priceCents)}`,
  };
}
