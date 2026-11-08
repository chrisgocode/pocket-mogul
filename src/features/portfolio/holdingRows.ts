import type { Holdings } from '@/application/holdingsView';
import { formatMoneyExact, formatQuantity } from '@/domain/money';
import { formatCashChange } from '@/features/game/priceFormat';
export function holdingRows(holdings: Holdings) {
  return [
    ...holdings.businesses.map((held) => ({
      id: held.id,
      kind: 'business' as const,
      title: held.name,
      subtitle: 'Business',
      value: formatMoneyExact(held.valueCents),
      detail: `Sells for ${formatMoneyExact(held.saleCents)}`,
    })),
    ...holdings.properties.map((held) => ({
      id: held.id,
      kind: 'property' as const,
      title: held.name,
      subtitle: held.rented ? 'Property · rented' : 'Property · vacant',
      value: formatMoneyExact(held.valueCents),
      detail: `Sells for ${formatMoneyExact(held.saleCents)}`,
    })),
    ...holdings.positions.map((held) => ({
      id: held.id,
      kind: 'asset' as const,
      title: held.name,
      subtitle: `${formatQuantity(held.quantity)} ${held.ticker}`,
      value: formatMoneyExact(held.valueCents),
      detail: `Unrealized ${formatCashChange(held.unrealizedCents)}`,
    })),
  ];
}
