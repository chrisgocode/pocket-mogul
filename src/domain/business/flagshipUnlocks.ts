import type { BusinessPricing } from './definition';
import { crewedVans } from './deliveryDemand';
import type { BusinessMechanic } from './mechanicRules';
import type { OwnedBusiness } from './owned';

export type FlagshipUnlock = 'none' | 'mechanic' | 'signature';

type UnlockStages = { readonly mechanic: number; readonly signature: number };

function unlockStages(mechanic: BusinessMechanic): UnlockStages | undefined {
  if (mechanic.kind === 'vending') {
    return {
      mechanic: mechanic.vending.unlockStage,
      signature: mechanic.vending.cardReaders.stage,
    };
  }
  if (mechanic.kind === 'car_wash') {
    return { mechanic: mechanic.carWash.unlockStage, signature: mechanic.carWash.detailing.stage };
  }
  if (mechanic.kind === 'delivery') {
    const { unlockStage, sortingHub } = mechanic.delivery;
    return { mechanic: unlockStage, signature: sortingHub.stage };
  }
  return undefined;
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
