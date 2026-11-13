import type { OwnedBusinessDetail } from '@/application/businessDetailView';

import type { BakeryActions } from './bakeryFormat';
import { BakerySection } from './BakerySection';
import type { CarWashActions } from './carWashFormat';
import { CarWashSection } from './CarWashSection';
import type { CoffeeKioskActions } from './coffeeKioskFormat';
import { CoffeeKioskSection } from './CoffeeKioskSection';
import type { DeliveryActions } from './deliveryFormat';
import { DeliverySection } from './DeliverySection';
import type { FoodCartActions } from './foodCartFormat';
import { FoodCartSection } from './FoodCartSection';
import type { GymActions } from './gymFormat';
import { GymSection } from './GymSection';
import type { LaundromatActions } from './laundromatFormat';
import { LaundromatSection } from './LaundromatSection';
import type { VendingActions } from './vendingFormat';
import { VendingSection } from './VendingSection';

export type FlagshipActions = {
  readonly vending: VendingActions;
  readonly carWash: CarWashActions;
  readonly delivery: DeliveryActions;
  readonly foodCart: FoodCartActions;
  readonly coffeeKiosk: CoffeeKioskActions;
  readonly laundromat: LaundromatActions;
  readonly bakery: BakeryActions;
  readonly gym: GymActions;
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
      <CoffeeKioskSection detail={detail} actions={actions.coffeeKiosk} />
      <LaundromatSection detail={detail} actions={actions.laundromat} />
      <BakerySection detail={detail} actions={actions.bakery} />
      <GymSection detail={detail} actions={actions.gym} />
    </>
  );
}
