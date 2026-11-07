import type { Holdings } from '@/application/holdingsView';
import { formatMoneyExact, formatQuantity } from '@/domain/money';
import { formatCashChange } from '@/features/game/priceFormat';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';

export function HoldingsCard({ holdings }: { holdings: Holdings }) {
  return (
    <Card>
      {holdings.businesses.map((held) => (
        <ListRow
          key={held.id}
          title={held.name}
          subtitle="Business"
          value={formatMoneyExact(held.valueCents)}
          detail={`Sells for ${formatMoneyExact(held.saleCents)}`}
        />
      ))}
      {holdings.properties.map((held) => (
        <ListRow
          key={held.id}
          title={held.name}
          subtitle={held.rented ? 'Property · rented' : 'Property · vacant'}
          value={formatMoneyExact(held.valueCents)}
          detail={`Sells for ${formatMoneyExact(held.saleCents)}`}
        />
      ))}
      {holdings.positions.map((held) => (
        <ListRow
          key={held.id}
          title={held.name}
          subtitle={`${formatQuantity(held.quantity)} ${held.ticker}`}
          value={formatMoneyExact(held.valueCents)}
          detail={`Unrealized ${formatCashChange(held.unrealizedCents)}`}
        />
      ))}
    </Card>
  );
}
