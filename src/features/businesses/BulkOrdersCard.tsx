import type { BulkView } from '@/application/factoryView';
import { formatMoneyExact } from '@/domain/money';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { AppText } from '@/ui/Typography';

import { daysLeftText } from './bakeryFormat';
import { BulkOfferRow } from './BulkOfferRow';
import type { FactoryActions } from './factoryFormat';

function progressNote(bulk: BulkView): string {
  if (bulk.due === 0) return `Made before open-market sales · 0 of ${bulk.maxOrders} running`;
  return `${bulk.made} of ${bulk.due} batches made today · ${bulk.orders.length} of ${bulk.maxOrders} running`;
}

function emptyNote(bulk: BulkView): string {
  if (bulk.orders.length >= bulk.maxOrders) {
    return `Your lines hold ${bulk.maxOrders} bulk orders at a time`;
  }
  return 'No offer today. A new client asks every few days';
}

export function BulkOrdersCard({
  bulk,
  onAnswer,
}: {
  bulk: BulkView;
  onAnswer: FactoryActions['answerBulkOffer'];
}) {
  return (
    <Card>
      <AppText variant="heading">Bulk orders</AppText>
      <AppText variant="caption" muted>
        {progressNote(bulk)}
      </AppText>
      {bulk.orders.map((order) => (
        <ListRow
          key={`${order.client}-${order.daysLeft}`}
          title={order.client}
          subtitle={`${order.batchesPerDay} batches a day · ${daysLeftText(order.daysLeft)}`}
          value={`${formatMoneyExact(order.rateCents)} a batch`}
        />
      ))}
      {bulk.offer === undefined ? (
        <AppText muted>{emptyNote(bulk)}</AppText>
      ) : (
        <BulkOfferRow offer={bulk.offer} onAnswer={onAnswer} />
      )}
    </Card>
  );
}
