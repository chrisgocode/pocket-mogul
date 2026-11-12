import type { AvailableOrderAhead } from '@/application/coffeeKioskView';
import { formatMoneyExact } from '@/domain/money';
import type { ActionSheetText } from '@/features/game/ActionSheet';
import { formatCashChange } from '@/features/game/priceFormat';

import { profitChange, spent } from './businessFormat';

export function orderAheadText(orderAhead: AvailableOrderAhead): ActionSheetText {
  return {
    title: 'Add order-ahead',
    lines: [
      { label: 'Treasury change', value: formatCashChange(spent(orderAhead.priceCents)) },
      { label: 'Profit', value: profitChange(orderAhead.profitCents, orderAhead.nextProfitCents) },
      { label: 'Morning rush', value: 'Every kiosk serves more cups in the rush' },
    ],
    confirmLabel: `Confirm · ${formatMoneyExact(orderAhead.priceCents)}`,
  };
}
