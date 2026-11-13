import type { WholesaleOfferView, WholesaleOrderView } from '@/application/bakeryView';
import { formatMoneyExact } from '@/domain/money';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { AppText } from '@/ui/Typography';

import { daysLeftText, type BakeryActions } from './bakeryFormat';
import { WholesaleOfferRow } from './WholesaleOfferRow';

function emptyNote(orders: number, maxOrders: number): string {
  if (orders >= maxOrders) return `Your ovens hold ${maxOrders} standing orders at a time`;
  return 'No offer today. A new client asks every couple of days';
}

export function WholesaleCard({
  orders,
  maxOrders,
  offer,
  onAnswer,
}: {
  orders: readonly WholesaleOrderView[];
  maxOrders: number;
  offer: WholesaleOfferView | undefined;
  onAnswer: BakeryActions['answerOffer'];
}) {
  return (
    <Card>
      <AppText variant="heading">Wholesale orders</AppText>
      <AppText variant="caption" muted>
        {`Baked before retail · ${orders.length} of ${maxOrders} running`}
      </AppText>
      {orders.map((order) => (
        <ListRow
          key={`${order.client}-${order.daysLeft}`}
          title={order.client}
          subtitle={`${order.ordersPerDay} orders a day · ${daysLeftText(order.daysLeft)}`}
          value={`${formatMoneyExact(order.feeCents)}/day`}
        />
      ))}
      {offer === undefined ? (
        <AppText muted>{emptyNote(orders.length, maxOrders)}</AppText>
      ) : (
        <WholesaleOfferRow offer={offer} onAnswer={onAnswer} />
      )}
    </Card>
  );
}
