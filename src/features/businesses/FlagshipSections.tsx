import type { OwnedBusinessDetail } from '@/application/businessDetailView';

import type { CarWashActions } from './carWashFormat';
import { CarWashSection } from './CarWashSection';
import type { VendingActions } from './vendingFormat';
import { VendingSection } from './VendingSection';

export type FlagshipActions = {
  readonly vending: VendingActions;
  readonly carWash: CarWashActions;
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
    </>
  );
}
