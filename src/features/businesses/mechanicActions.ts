import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import type { GameCommand } from '@/domain/commands';
import type { ActionSheetText } from '@/features/game/ActionSheet';

import { centralKitchenText } from './bakeryActionText';
import type { BakeryActions } from './bakeryFormat';
import type { BusinessAction } from './businessAction';
import { orderAheadText } from './coffeeKioskActionText';
import type { CoffeeKioskActions } from './coffeeKioskFormat';
import { secondWindowText } from './foodCartActionText';
import type { FoodCartActions } from './foodCartFormat';
import { allHoursText } from './gymActionText';
import type { GymActions } from './gymFormat';
import { pickupText } from './laundromatActionText';
import type { LaundromatActions } from './laundromatFormat';
import type { useBusinessCommand } from './useBusinessCommand';

type Handlers = {
  readonly run: ReturnType<typeof useBusinessCommand>;
  readonly review: (action: BusinessAction) => void;
};

type Signature = { readonly command: GameCommand; readonly text: ActionSheetText };

function mechanicHandlers(detail: OwnedBusinessDetail, handlers: Handlers) {
  const { business } = detail;
  return {
    businessId: business.id,
    run: handlers.run,
    reviewSignature: (signature: Signature) =>
      handlers.review({ kind: 'signature', business, ...signature }),
  };
}

export function foodCartActions(detail: OwnedBusinessDetail, handlers: Handlers): FoodCartActions {
  const { businessId, run, reviewSignature } = mechanicHandlers(detail, handlers);
  return {
    setSpot: (spot) => run({ type: 'SetCartSpot', businessId, spot }),
    setMenuItem: (change) => run({ type: 'SetMenuItem', businessId, ...change }),
    dismissCoachMark: () => run({ type: 'DismissCoachMark', coachMark: 'food_cart' }),
    installSecondWindow: (secondWindow) =>
      reviewSignature({
        command: { type: 'InstallSecondWindow', businessId },
        text: secondWindowText(secondWindow),
      }),
  };
}

export function coffeeKioskActions(
  detail: OwnedBusinessDetail,
  handlers: Handlers,
): CoffeeKioskActions {
  const { businessId, run, reviewSignature } = mechanicHandlers(detail, handlers);
  return {
    setGrade: (grade) => run({ type: 'SetBeanGrade', businessId, grade }),
    setPlan: (plan) => run({ type: 'SetRushPlan', businessId, plan }),
    dismissCoachMark: () => run({ type: 'DismissCoachMark', coachMark: 'coffee_kiosk' }),
    installOrderAhead: (orderAhead) =>
      reviewSignature({
        command: { type: 'InstallOrderAhead', businessId },
        text: orderAheadText(orderAhead),
      }),
  };
}

export function laundromatActions(
  detail: OwnedBusinessDetail,
  handlers: Handlers,
): LaundromatActions {
  const { businessId, run, reviewSignature } = mechanicHandlers(detail, handlers);
  return {
    setJumboShare: (percent) => run({ type: 'SetJumboShare', businessId, percent }),
    setServiceLevel: (level) => run({ type: 'SetServiceLevel', businessId, level }),
    dismissCoachMark: () => run({ type: 'DismissCoachMark', coachMark: 'laundromat' }),
    installPickup: (pickup) =>
      reviewSignature({ command: { type: 'InstallPickup', businessId }, text: pickupText(pickup) }),
  };
}

export function bakeryActions(detail: OwnedBusinessDetail, handlers: Handlers): BakeryActions {
  const { businessId, run, reviewSignature } = mechanicHandlers(detail, handlers);
  return {
    setBakeLevel: (percent) => run({ type: 'SetBakeLevel', businessId, percent }),
    answerOffer: (answer) => run({ type: 'AnswerWholesaleOffer', businessId, ...answer }),
    dismissCoachMark: () => run({ type: 'DismissCoachMark', coachMark: 'bakery' }),
    installCentralKitchen: (centralKitchen) =>
      reviewSignature({
        command: { type: 'InstallCentralKitchen', businessId },
        text: centralKitchenText(centralKitchen),
      }),
  };
}

export function gymActions(detail: OwnedBusinessDetail, handlers: Handlers): GymActions {
  const { businessId, run, reviewSignature } = mechanicHandlers(detail, handlers);
  return {
    setTier: (tier) => run({ type: 'SetGymTier', businessId, tier }),
    setClassLevel: (level) => run({ type: 'SetClassLevel', businessId, level }),
    dismissCoachMark: () => run({ type: 'DismissCoachMark', coachMark: 'gym' }),
    installAllHours: (allHours) =>
      reviewSignature({
        command: { type: 'InstallAllHours', businessId },
        text: allHoursText(allHours),
      }),
  };
}
