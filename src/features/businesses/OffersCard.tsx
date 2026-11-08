import type { OfferView } from '@/application/deliveryView';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';

import type { DeliveryActions } from './deliveryFormat';
import { OfferRow } from './OfferRow';

export function OffersCard({
  offers,
  actions,
}: {
  offers: readonly OfferView[];
  actions: DeliveryActions;
}) {
  if (offers.length === 0) {
    return (
      <Card>
        <ListRow title="Offers" subtitle="No offers on the board. New ones arrive tomorrow." />
      </Card>
    );
  }
  return (
    <Card>
      {offers.map((offer) => (
        <OfferRow key={offer.id} offer={offer} actions={actions} />
      ))}
    </Card>
  );
}
