import type { OwnedBusinessDetail } from '@/application/businessDetailView';

import type { CarWashActions } from './carWashFormat';
import { CarWashSection } from './CarWashSection';
import type { DeliveryActions } from './deliveryFormat';
import { DeliverySection } from './DeliverySection';
import type { FoodCartActions } from './foodCartFormat';
import { FoodCartSection } from './FoodCartSection';
import type { VendingActions } from './vendingFormat';
import { VendingSection } from './VendingSection';

export type FlagshipActions = {
  readonly vending: VendingActions;
  readonly carWash: CarWashActions;
  readonly delivery: DeliveryActions;
  readonly foodCart: FoodCartActions;
};

export function FlagshipSections({
  detail,
  actions,
}: {
  detail: OwnedBusinessDetail;
  actions: FlagshipActions;
}) {
  return (
    <>
      <VendingSection detail={detail} actions={actions.vending} />
      <CarWashSection detail={detail} actions={actions.carWash} />
      <DeliverySection detail={detail} actions={actions.delivery} />
      <FoodCartSection detail={detail} actions={actions.foodCart} />
    </>
  );
}
