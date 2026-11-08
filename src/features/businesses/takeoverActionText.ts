import type { Business } from '@/content';
import { formatMoneyExact } from '@/domain/money';
import type { ActionSheetText } from '@/features/game/ActionSheet';
import { formatCashChange } from '@/features/game/priceFormat';

import { profitChange, spent } from './businessFormat';
import { unitCount, wholeChance, type TakeoverChoice } from './takeoverFormat';

export function takeoverText(choice: TakeoverChoice, business: Business): ActionSheetText {
  const { rival, offer } = choice;
  const price = formatMoneyExact(offer.priceCents);
  return {
    title: `Offer to buy ${rival.name}`,
    lines: [
      { label: 'Treasury change if accepted', value: formatCashChange(spent(offer.priceCents)) },
      { label: 'Share of valuation', value: `${offer.percent}%` },
      { label: 'Chance they accept', value: wholeChance(offer.chanceBps) },
      { label: 'Units if accepted', value: unitCount(business, offer.unitsAfter) },
      { label: 'Quality if accepted', value: String(offer.qualityAfter) },
      {
        label: 'Profit if accepted',
        value: profitChange(offer.profitCents, offer.nextProfitCents),
      },
    ],
    confirmLabel: `Make offer · ${price}`,
  };
}
