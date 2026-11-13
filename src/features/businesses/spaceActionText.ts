import type { AvailableBoosters } from '@/application/spaceView';
import { formatMoneyExact } from '@/domain/money';
import type { ActionSheetText } from '@/features/game/ActionSheet';
import { formatCashChange } from '@/features/game/priceFormat';

import { profitChange, spent } from './businessFormat';

export function boostersText(boosters: AvailableBoosters): ActionSheetText {
  return {
    title: 'Add reusable boosters',
    lines: [
      { label: 'Treasury change', value: formatCashChange(spent(boosters.priceCents)) },
      { label: 'Profit', value: profitChange(boosters.profitCents, boosters.nextProfitCents) },
      { label: 'Pads', value: 'Every pad launches more payloads a day' },
    ],
    confirmLabel: `Confirm · ${formatMoneyExact(boosters.priceCents)}`,
  };
}
