import type { AvailableDetailing } from '@/application/carWashView';
import { formatMoneyExact } from '@/domain/money';
import type { ActionSheetText } from '@/features/game/ActionSheet';
import { formatCashChange } from '@/features/game/priceFormat';

import { profitChange, spent } from './businessFormat';

export function detailingText(detailing: AvailableDetailing): ActionSheetText {
  return {
    title: 'Add detailing',
    lines: [
      { label: 'Treasury change', value: formatCashChange(spent(detailing.priceCents)) },
      { label: 'Profit', value: profitChange(detailing.profitCents, detailing.nextProfitCents) },
      { label: 'Walk-ins', value: 'A fourth package at the top price' },
    ],
    confirmLabel: `Confirm · ${formatMoneyExact(detailing.priceCents)}`,
  };
}
