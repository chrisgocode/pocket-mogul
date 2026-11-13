import type { AvailableAutomation } from '@/application/factoryView';
import { formatMoneyExact } from '@/domain/money';
import type { ActionSheetText } from '@/features/game/ActionSheet';
import { formatCashChange } from '@/features/game/priceFormat';

import { profitChange, spent } from './businessFormat';

export function automationText(automation: AvailableAutomation): ActionSheetText {
  return {
    title: 'Add automation',
    lines: [
      { label: 'Treasury change', value: formatCashChange(spent(automation.priceCents)) },
      { label: 'Profit', value: profitChange(automation.profitCents, automation.nextProfitCents) },
      { label: 'Lines', value: 'Every batch costs less to make' },
    ],
    confirmLabel: `Confirm · ${formatMoneyExact(automation.priceCents)}`,
  };
}
