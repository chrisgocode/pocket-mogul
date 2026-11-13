import type { AvailableConference } from '@/application/hotelView';
import { formatMoneyExact } from '@/domain/money';
import type { ActionSheetText } from '@/features/game/ActionSheet';
import { formatCashChange } from '@/features/game/priceFormat';

import { profitChange, spent } from './businessFormat';

export function conferenceText(conference: AvailableConference): ActionSheetText {
  return {
    title: 'Add a conference centre',
    lines: [
      { label: 'Treasury change', value: formatCashChange(spent(conference.priceCents)) },
      {
        label: 'Profit in Event season',
        value: profitChange(conference.profitCents, conference.nextProfitCents),
      },
      { label: 'Guests', value: 'More guests in every Event season' },
    ],
    confirmLabel: `Confirm · ${formatMoneyExact(conference.priceCents)}`,
  };
}
