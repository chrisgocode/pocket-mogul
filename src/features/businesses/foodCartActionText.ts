import type { AvailableSecondWindow } from '@/application/foodCartView';
import { formatMoneyExact } from '@/domain/money';
import type { ActionSheetText } from '@/features/game/ActionSheet';
import { formatCashChange } from '@/features/game/priceFormat';

import { profitChange, spent } from './businessFormat';

export function secondWindowText(secondWindow: AvailableSecondWindow): ActionSheetText {
  return {
    title: 'Add a second window',
    lines: [
      { label: 'Treasury change', value: formatCashChange(spent(secondWindow.priceCents)) },
      {
        label: 'Profit',
        value: profitChange(secondWindow.profitCents, secondWindow.nextProfitCents),
      },
      { label: 'Serving', value: 'Every cart serves more meals a day' },
    ],
    confirmLabel: `Confirm · ${formatMoneyExact(secondWindow.priceCents)}`,
  };
}
