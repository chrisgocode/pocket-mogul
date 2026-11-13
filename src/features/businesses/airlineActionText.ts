import type { AvailableHub } from '@/application/airlineView';
import { formatMoneyExact } from '@/domain/money';
import type { ActionSheetText } from '@/features/game/ActionSheet';
import { formatCashChange } from '@/features/game/priceFormat';

import { profitChange, spent } from './businessFormat';

export function hubText(hub: AvailableHub): ActionSheetText {
  return {
    title: 'Add an international hub',
    lines: [
      { label: 'Treasury change', value: formatCashChange(spent(hub.priceCents)) },
      { label: 'Profit', value: profitChange(hub.profitCents, hub.nextProfitCents) },
      { label: 'Fleet', value: 'Every plane flies more seats a day' },
    ],
    confirmLabel: `Confirm · ${formatMoneyExact(hub.priceCents)}`,
  };
}
