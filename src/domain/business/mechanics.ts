import { carWashDay, runningCarWash } from './carWashDemand';
import type { BusinessPricing } from './definition';
import type { OwnedBusiness } from './owned';
import { vendingCapacityBps, vendingDemandBps } from './vendingDemand';

export type MechanicDay = {
  readonly demandBps: bigint;
  readonly capacityBps: bigint;
  readonly priceBps: bigint;
  readonly bayBps: bigint;
  readonly memberBay: bigint;
  readonly memberFeesCents: bigint;
};

const NO_EFFECT_BPS = 10_000n;

export function mechanicDay(business: OwnedBusiness, pricing: BusinessPricing): MechanicDay {
  const neutral = {
    demandBps: vendingDemandBps(business, pricing),
    capacityBps: vendingCapacityBps(business, pricing),
    priceBps: NO_EFFECT_BPS,
    bayBps: NO_EFFECT_BPS,
    memberBay: 0n,
    memberFeesCents: 0n,
  };
  const running = runningCarWash(business, pricing);
  if (running === undefined) return neutral;
  return { ...neutral, ...carWashDay(running, pricing) };
}
