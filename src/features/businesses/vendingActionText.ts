import type { AvailableCardReaders } from '@/application/vendingView';
import { formatMoneyExact } from '@/domain/money';
import type { ActionSheetText } from '@/features/game/ActionSheet';
import { formatCashChange } from '@/features/game/priceFormat';

import { profitChange, spent } from './businessFormat';

export function cardReaderText(readers: AvailableCardReaders): ActionSheetText {
  return {
    title: 'Install card readers',
    lines: [
      { label: 'Treasury change', value: formatCashChange(spent(readers.priceCents)) },
      { label: 'Profit', value: profitChange(readers.profitCents, readers.nextProfitCents) },
      { label: 'Customers', value: '+20% at every price' },
    ],
    confirmLabel: `Confirm · ${formatMoneyExact(readers.priceCents)}`,
  };
}
