import type { OwnedBusinessDetail } from '@/application/businessDetailView';

import type { BakeryActions } from './bakeryFormat';
import type { BusinessAction } from './businessAction';
import type { CoffeeKioskActions } from './coffeeKioskFormat';
import type { FoodCartActions } from './foodCartFormat';
import type { LaundromatActions } from './laundromatFormat';
import type { useBusinessCommand } from './useBusinessCommand';

type Handlers = {
  readonly run: ReturnType<typeof useBusinessCommand>;
  readonly review: (action: BusinessAction) => void;
};

export function foodCartActions(detail: OwnedBusinessDetail, handlers: Handlers): FoodCartActions {
  const { business } = detail;
  const businessId = business.id;
  const { run, review } = handlers;
  return {
    setSpot: (spot) => run({ type: 'SetCartSpot', businessId, spot }),
    setMenuItem: (change) => run({ type: 'SetMenuItem', businessId, ...change }),
    dismissCoachMark: () => run({ type: 'DismissCoachMark', coachMark: 'food_cart' }),
    installSecondWindow: (secondWindow) =>
      review({ kind: 'second_window', business, secondWindow }),
  };
}

export function coffeeKioskActions(
  detail: OwnedBusinessDetail,
  handlers: Handlers,
): CoffeeKioskActions {
  const { business } = detail;
  const businessId = business.id;
  const { run, review } = handlers;
  return {
    setGrade: (grade) => run({ type: 'SetBeanGrade', businessId, grade }),
    setPlan: (plan) => run({ type: 'SetRushPlan', businessId, plan }),
    dismissCoachMark: () => run({ type: 'DismissCoachMark', coachMark: 'coffee_kiosk' }),
    installOrderAhead: (orderAhead) => review({ kind: 'order_ahead', business, orderAhead }),
  };
}

export function laundromatActions(
  detail: OwnedBusinessDetail,
  handlers: Handlers,
): LaundromatActions {
  const { business } = detail;
  const businessId = business.id;
  const { run, review } = handlers;
  return {
    setJumboShare: (percent) => run({ type: 'SetJumboShare', businessId, percent }),
    setServiceLevel: (level) => run({ type: 'SetServiceLevel', businessId, level }),
    dismissCoachMark: () => run({ type: 'DismissCoachMark', coachMark: 'laundromat' }),
    installPickup: (pickup) => review({ kind: 'pickup', business, pickup }),
  };
}

export function bakeryActions(detail: OwnedBusinessDetail, handlers: Handlers): BakeryActions {
  const { business } = detail;
  const businessId = business.id;
  const { run, review } = handlers;
  return {
    setBakeLevel: (percent) => run({ type: 'SetBakeLevel', businessId, percent }),
    answerOffer: (answer) => run({ type: 'AnswerWholesaleOffer', businessId, ...answer }),
    dismissCoachMark: () => run({ type: 'DismissCoachMark', coachMark: 'bakery' }),
    installCentralKitchen: (centralKitchen) =>
      review({ kind: 'central_kitchen', business, centralKitchen }),
  };
}
