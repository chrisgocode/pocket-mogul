import type { BusinessPricing } from './definition';
import type { OwnedBusiness } from './owned';
import type { Synergy, SynergyEffect } from './synergyRules';

const NO_EFFECT_BPS = 10_000n;
const BPS_PER_PERCENT = 100n;

type SynergyDay = {
  readonly demandBps: bigint;
  readonly capacityBps: bigint;
  readonly costBps: bigint;
};

export function activeSynergies(business: OwnedBusiness, pricing: BusinessPricing): Synergy[] {
  return pricing.definition.synergies.filter((synergy) => business.synergies.includes(synergy.id));
}

export function withSynergiesSynced(
  business: OwnedBusiness,
  owning: { readonly pricing: BusinessPricing; readonly ownedIds: readonly string[] },
): OwnedBusiness {
  const synergies = owning.pricing.definition.synergies
    .filter((synergy) => owning.ownedIds.includes(synergy.partnerId))
    .map((synergy) => synergy.id);
  return { ...business, synergies };
}

function totalBps(synergies: readonly Synergy[], effect: SynergyEffect): bigint {
  const percent = synergies
    .filter((synergy) => synergy.effect === effect)
    .reduce((total, synergy) => total + synergy.percent, 0);
  return BigInt(percent) * BPS_PER_PERCENT;
}

export function synergyDay(business: OwnedBusiness, pricing: BusinessPricing): SynergyDay {
  const active = activeSynergies(business, pricing);
  const saved = totalBps(active, 'cost');
  return {
    demandBps: NO_EFFECT_BPS + totalBps(active, 'demand'),
    capacityBps: NO_EFFECT_BPS + totalBps(active, 'capacity'),
    costBps: saved < NO_EFFECT_BPS ? NO_EFFECT_BPS - saved : 0n,
  };
}
