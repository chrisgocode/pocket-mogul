import { bakeryDay, runningBakery } from './bakeryDemand';
import { carWashDay, runningCarWash } from './carWashDemand';
import { coffeeKioskDay, runningCoffeeKiosk } from './coffeeKioskDemand';
import { airlineDay, runningAirline } from './airlineDemand';
import { spaceDay, runningSpace } from './spaceDemand';
import type { BusinessPricing } from './definition';
import { deliveryDay, runningDelivery } from './deliveryDemand';
import type { ContractTerms } from './deliveryState';
import { factoryDay, runningFactory } from './factoryDemand';
import { foodCartDay, runningFoodCart } from './foodCartDemand';
import { gymDay, runningGym } from './gymDemand';
import { hotelDay, runningHotel } from './hotelDemand';
import { laundromatDay, runningLaundromat } from './laundromatDemand';
import type { OwnedBusiness } from './owned';
import { NO_RUSH, type RushDay } from './rush';
import { synergyDay } from './synergies';
import { vendingCapacityBps, vendingDemandBps } from './vendingDemand';

export type MechanicDay = {
  readonly demandBps: bigint;
  readonly capacityBps: bigint;
  readonly priceBps: bigint;
  readonly costBps: bigint;
  readonly unsoldCostBps: bigint;
  readonly rush: RushDay;
  readonly bayBps: bigint;
  readonly memberBay: bigint;
  readonly memberFeesCents: bigint;
  readonly efficiencyLevel: number;
  readonly workingUnits: number;
  readonly contracts: readonly ContractTerms[];
};

const NO_EFFECT_BPS = 10_000n;

function travelDay(business: OwnedBusiness, pricing: BusinessPricing) {
  const airline = runningAirline(business, pricing);
  if (airline !== undefined) return airlineDay(airline);
  const space = runningSpace(business, pricing);
  return space === undefined ? {} : spaceDay(space);
}

function industryDay(business: OwnedBusiness, pricing: BusinessPricing) {
  const factory = runningFactory(business, pricing);
  if (factory !== undefined) return factoryDay(factory);
  return travelDay(business, pricing);
}

function shopDay(business: OwnedBusiness, pricing: BusinessPricing) {
  const bakery = runningBakery(business, pricing);
  if (bakery !== undefined) return bakeryDay(bakery, pricing);
  const gym = runningGym(business, pricing);
  if (gym !== undefined) return gymDay(gym);
  const hotel = runningHotel(business, pricing);
  if (hotel !== undefined) return hotelDay(business, hotel);
  return industryDay(business, pricing);
}

function streetDay(business: OwnedBusiness, pricing: BusinessPricing) {
  const foodCart = runningFoodCart(business, pricing);
  if (foodCart !== undefined) return foodCartDay(foodCart);
  const coffeeKiosk = runningCoffeeKiosk(business, pricing);
  if (coffeeKiosk !== undefined) return coffeeKioskDay(coffeeKiosk);
  const running = runningLaundromat(business, pricing);
  if (running !== undefined) return laundromatDay(business, { ...pricing, running });
  return shopDay(business, pricing);
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
    unsoldCostBps: 0n,
    rush: NO_RUSH,
    bayBps: NO_EFFECT_BPS,
    memberBay: 0n,
    memberFeesCents: 0n,
    efficiencyLevel: business.levels.efficiency,
    workingUnits: business.units,
    contracts: [],
  };
  const day = { ...neutral, ...flagshipDay(business, pricing) };
  const synergy = synergyDay(business, pricing);
  return {
    ...day,
    demandBps: (day.demandBps * synergy.demandBps) / NO_EFFECT_BPS,
    capacityBps: (day.capacityBps * synergy.capacityBps) / NO_EFFECT_BPS,
    costBps: (day.costBps * synergy.costBps) / NO_EFFECT_BPS,
  };
}
