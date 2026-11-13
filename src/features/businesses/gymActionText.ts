import type { AvailableAllHours } from '@/application/gymView';
import { formatMoneyExact } from '@/domain/money';
import type { ActionSheetText } from '@/features/game/ActionSheet';
import { formatCashChange } from '@/features/game/priceFormat';

import { profitChange, spent } from './businessFormat';

export function allHoursText(allHours: AvailableAllHours): ActionSheetText {
  return {
    title: 'Add 24-hour access',
    lines: [
      { label: 'Treasury change', value: formatCashChange(spent(allHours.priceCents)) },
      { label: 'Profit', value: profitChange(allHours.profitCents, allHours.nextProfitCents) },
      { label: 'Studios', value: 'Every studio holds more visits a day' },
    ],
    confirmLabel: `Confirm · ${formatMoneyExact(allHours.priceCents)}`,
  };
}
