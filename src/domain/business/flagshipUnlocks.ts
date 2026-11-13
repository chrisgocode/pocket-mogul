import type { BusinessPricing } from './definition';
import { crewedVans } from './deliveryDemand';
import type { BusinessMechanic } from './mechanicRules';
import type { OwnedBusiness } from './owned';

export type FlagshipUnlock = 'none' | 'mechanic' | 'signature';

type UnlockStages = { readonly mechanic: number; readonly signature: number };

type Kind = BusinessMechanic['kind'];
type MechanicOf<Each extends Kind> = Extract<BusinessMechanic, { kind: Each }>;

const stagesOf = (
  rules: { readonly unlockStage: number },
  upgrade: { readonly stage: number },
) => ({
  mechanic: rules.unlockStage,
  signature: upgrade.stage,
});

const UNLOCK_STAGES: {
  readonly [Each in Kind]: (mechanic: MechanicOf<Each>) => UnlockStages | undefined;
} = {
  shared_core: () => undefined,
  vending: ({ vending }) => stagesOf(vending, vending.cardReaders),
  car_wash: ({ carWash }) => stagesOf(carWash, carWash.detailing),
  delivery: ({ delivery }) => stagesOf(delivery, delivery.sortingHub),
  food_cart: ({ foodCart }) => stagesOf(foodCart, foodCart.secondWindow),
  coffee_kiosk: ({ coffeeKiosk }) => stagesOf(coffeeKiosk, coffeeKiosk.orderAhead),
  laundromat: ({ laundromat }) => stagesOf(laundromat, laundromat.pickup),
  bakery: ({ bakery }) => stagesOf(bakery, bakery.centralKitchen),
  gym: ({ gym }) => stagesOf(gym, gym.allHours),
  hotel: ({ hotel }) => stagesOf(hotel, hotel.conference),
  factory: ({ factory }) => stagesOf(factory, factory.automation),
  airline: ({ airline }) => stagesOf(airline, airline.hub),
};

function unlockStages<Each extends Kind>(mechanic: MechanicOf<Each>): UnlockStages | undefined {
  const stages: (mechanic: MechanicOf<Each>) => UnlockStages | undefined =
    UNLOCK_STAGES[mechanic.kind];
  return stages(mechanic);
}

export function flagshipUnlockAt(mechanic: BusinessMechanic, stage: number): FlagshipUnlock {
  const stages = unlockStages(mechanic);
  if (stages?.mechanic === stage) return 'mechanic';
  if (stages?.signature === stage) return 'signature';
  return 'none';
}

export function unitsParkedAt(
  business: OwnedBusiness,
  growing: { readonly pricing: BusinessPricing; readonly stage: number },
): number {
  const { mechanic } = growing.pricing.definition;
  if (mechanic.kind !== 'delivery' || mechanic.delivery.unlockStage !== growing.stage) return 0;
  return business.units - crewedVans(business, mechanic.delivery);
}
