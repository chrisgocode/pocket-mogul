import type { AvailableCentralKitchen } from '@/application/bakeryView';
import { formatMoneyExact } from '@/domain/money';
import type { ActionSheetText } from '@/features/game/ActionSheet';
import { formatCashChange } from '@/features/game/priceFormat';

import { profitChange, spent } from './businessFormat';

export function centralKitchenText(kitchen: AvailableCentralKitchen): ActionSheetText {
  return {
    title: 'Add a central kitchen',
    lines: [
      { label: 'Treasury change', value: formatCashChange(spent(kitchen.priceCents)) },
      { label: 'Profit', value: profitChange(kitchen.profitCents, kitchen.nextProfitCents) },
      { label: 'Ovens', value: 'Every oven bakes more orders a day' },
    ],
    confirmLabel: `Confirm · ${formatMoneyExact(kitchen.priceCents)}`,
  };
}
