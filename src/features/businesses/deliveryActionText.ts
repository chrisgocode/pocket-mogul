import type { AvailableSortingHub, OfferView } from '@/application/deliveryView';
import { formatMoneyExact } from '@/domain/money';
import type { ActionSheetText } from '@/features/game/ActionSheet';
import { formatCashChange } from '@/features/game/priceFormat';

import { profitChange, spent } from './businessFormat';
import { daysText, parcels } from './deliveryFormat';

export function contractText(offer: OfferView): ActionSheetText {
  return {
    title: `Accept ${offer.client}`,
    lines: [
      { label: 'Parcels per day', value: parcels(offer.parcelsPerDay) },
      { label: 'Rate per parcel', value: formatMoneyExact(offer.rateCents) },
      { label: 'Penalty per missed parcel', value: formatMoneyExact(offer.penaltyCents) },
      { label: 'Length', value: daysText(offer.days) },
      { label: 'Profit', value: profitChange(offer.profitCents, offer.nextProfitCents) },
    ],
    confirmLabel: 'Accept contract',
  };
}

export function sortingHubText(hub: AvailableSortingHub): ActionSheetText {
  return {
    title: 'Build a sorting hub',
    lines: [
      { label: 'Treasury change', value: formatCashChange(spent(hub.priceCents)) },
      { label: 'Profit', value: profitChange(hub.profitCents, hub.nextProfitCents) },
      { label: 'Capacity', value: `+${hub.capacityPercent}% parcels a day` },
    ],
    confirmLabel: `Confirm · ${formatMoneyExact(hub.priceCents)}`,
  };
}
