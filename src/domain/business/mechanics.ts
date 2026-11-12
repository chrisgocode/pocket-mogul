import { carWashDay, runningCarWash } from './carWashDemand';
import { coffeeKioskDay, runningCoffeeKiosk } from './coffeeKioskDemand';
import type { BusinessPricing } from './definition';
import { deliveryDay, runningDelivery } from './deliveryDemand';
import type { ContractTerms } from './deliveryState';
import { foodCartDay, runningFoodCart } from './foodCartDemand';
import type { OwnedBusiness } from './owned';
import { NO_RUSH, type RushDay } from './rush';
import { vendingCapacityBps, vendingDemandBps } from './vendingDemand';

export type MechanicDay = {
  readonly demandBps: bigint;
  readonly capacityBps: bigint;
  readonly priceBps: bigint;
  readonly costBps: bigint;
  readonly rush: RushDay;
  readonly bayBps: bigint;
  readonly memberBay: bigint;
  readonly memberFeesCents: bigint;
  readonly efficiencyLevel: number;
  readonly workingUnits: number;
  readonly contracts: readonly ContractTerms[];
};

const NO_EFFECT_BPS = 10_000n;

function streetDay(business: OwnedBusiness, pricing: BusinessPricing) {
  const foodCart = runningFoodCart(business, pricing);
  if (foodCart !== undefined) return foodCartDay(foodCart);
  const coffeeKiosk = runningCoffeeKiosk(business, pricing);
  return coffeeKiosk === undefined ? {} : coffeeKioskDay(coffeeKiosk);
}

function flagshipDay(business: OwnedBusiness, pricing: BusinessPricing) {
  const delivery = runningDelivery(business, pricing);
  if (delivery !== undefined) return deliveryDay(business, delivery);
  const carWash = runningCarWash(business, pricing);
  if (carWash !== undefined) return carWashDay(carWash, pricing);
  return streetDay(business, pricing);
}

export function mechanicDay(business: OwnedBusiness, pricing: BusinessPricing): MechanicDay {
  const neutral = {
    demandBps: vendingDemandBps(business, pricing),
    capacityBps: vendingCapacityBps(business, pricing),
    priceBps: NO_EFFECT_BPS,
    costBps: NO_EFFECT_BPS,
    rush: NO_RUSH,
    bayBps: NO_EFFECT_BPS,
    memberBay: 0n,
    memberFeesCents: 0n,
    efficiencyLevel: business.levels.efficiency,
    workingUnits: business.units,
    contracts: [],
  };
  return { ...neutral, ...flagshipDay(business, pricing) };
}
