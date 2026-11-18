import { startAirlineDay, withAirlineUnlocked } from './airline';
import { startBakeryDay, withBakeryUnlocked } from './bakery';
import { startCarWashDay, withCarWashUnlocked } from './carWash';
import { withBestRushPlan, withCoffeeKioskUnlocked } from './coffeeKiosk';
import type { BusinessPricing } from './definition';
import { endedDeliveryDay, startDeliveryDay, withDeliveryUnlocked } from './delivery';
import { startFactoryDay, withFactoryUnlocked } from './factory';
import { startFoodCartDay, withFoodCartUnlocked } from './foodCart';
import { startGymDay, withGymUnlocked } from './gym';
import { startHotelDay, withHotelUnlocked } from './hotel';
import { withBestJumboShare, withLaundromatUnlocked } from './laundromat';
import type { BusinessMechanic } from './mechanicRules';
import type { OwnedBusiness } from './owned';
import { startSpaceDay, withSpaceUnlocked } from './space';
import { restockedByStaff, soldVendingDay, withBestMixes, withVendingUnlocked } from './vending';

type FlagshipDayStart = {
  readonly pricing: BusinessPricing;
  readonly seed: string;
  readonly day: number;
};

type DayStep = (business: OwnedBusiness, start: FlagshipDayStart) => OwnedBusiness;

type FlagshipLifecycle = {
  readonly dayEnded: DayStep;
  readonly dayOpened: DayStep;
  readonly managerChoices: (business: OwnedBusiness, pricing: BusinessPricing) => OwnedBusiness;
  readonly dayManaged: DayStep;
  readonly unlocked: DayStep;
};

const unchanged = (business: OwnedBusiness) => business;

const QUIET: FlagshipLifecycle = {
  dayEnded: unchanged,
  dayOpened: unchanged,
  managerChoices: unchanged,
  dayManaged: unchanged,
  unlocked: unchanged,
};

type FlagshipSteps = Partial<FlagshipLifecycle> & Pick<FlagshipLifecycle, 'unlocked'>;

const lifecycle = (steps: FlagshipSteps): FlagshipLifecycle => ({
  ...QUIET,
  ...steps,
});

const byPricing =
  (step: (business: OwnedBusiness, pricing: BusinessPricing) => OwnedBusiness): DayStep =>
  (business, start) =>
    step(business, start.pricing);

const LIFECYCLES: { readonly [Kind in BusinessMechanic['kind']]: FlagshipLifecycle } = {
  shared_core: QUIET,
  vending: lifecycle({
    dayEnded: (business, start) =>
      withVendingUnlocked(soldVendingDay(business, start.pricing), start.pricing),
    dayOpened: byPricing(restockedByStaff),
    managerChoices: withBestMixes,
    unlocked: byPricing(withVendingUnlocked),
  }),
  car_wash: lifecycle({ dayOpened: startCarWashDay, unlocked: withCarWashUnlocked }),
  delivery: lifecycle({
    dayEnded: endedDeliveryDay,
    dayManaged: startDeliveryDay,
    unlocked: withDeliveryUnlocked,
  }),
  food_cart: lifecycle({ dayOpened: startFoodCartDay, unlocked: withFoodCartUnlocked }),
  coffee_kiosk: lifecycle({
    dayEnded: byPricing(withCoffeeKioskUnlocked),
    managerChoices: withBestRushPlan,
    unlocked: byPricing(withCoffeeKioskUnlocked),
  }),
  laundromat: lifecycle({
    dayEnded: byPricing(withLaundromatUnlocked),
    managerChoices: withBestJumboShare,
    unlocked: byPricing(withLaundromatUnlocked),
  }),
  bakery: lifecycle({ dayOpened: startBakeryDay, unlocked: byPricing(withBakeryUnlocked) }),
  gym: lifecycle({ dayOpened: byPricing(startGymDay), unlocked: byPricing(withGymUnlocked) }),
  hotel: lifecycle({ dayOpened: startHotelDay, unlocked: withHotelUnlocked }),
  factory: lifecycle({ dayOpened: startFactoryDay, unlocked: byPricing(withFactoryUnlocked) }),
  airline: lifecycle({ dayOpened: startAirlineDay, unlocked: withAirlineUnlocked }),
  space: lifecycle({ dayOpened: startSpaceDay, unlocked: withSpaceUnlocked }),
};

export function flagshipLifecycle(pricing: BusinessPricing): FlagshipLifecycle {
  return LIFECYCLES[pricing.definition.mechanic.kind];
}
