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
import type { BusinessMechanic } from './mechanicRules';
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

type FlagshipDay = (business: OwnedBusiness, pricing: BusinessPricing) => Partial<MechanicDay>;

function running<Running>(
  runningOf: (business: OwnedBusiness, pricing: BusinessPricing) => Running | undefined,
  dayOf: (
    running: Running,
    business: OwnedBusiness,
    pricing: BusinessPricing,
  ) => Partial<MechanicDay>,
): FlagshipDay {
  return (business, pricing) => {
    const operation = runningOf(business, pricing);
    return operation === undefined ? {} : dayOf(operation, business, pricing);
  };
}

const FLAGSHIP_DAYS: { readonly [Kind in BusinessMechanic['kind']]: FlagshipDay } = {
  shared_core: () => ({}),
  vending: (business, pricing) => ({
    demandBps: vendingDemandBps(business, pricing),
    capacityBps: vendingCapacityBps(business, pricing),
  }),
  car_wash: running(runningCarWash, (carWash, _, pricing) => carWashDay(carWash, pricing)),
  delivery: running(runningDelivery, (delivery, business) => deliveryDay(business, delivery)),
  food_cart: running(runningFoodCart, foodCartDay),
  coffee_kiosk: running(runningCoffeeKiosk, coffeeKioskDay),
  laundromat: running(runningLaundromat, (laundromat, business, pricing) =>
    laundromatDay(business, { ...pricing, running: laundromat }),
  ),
  bakery: running(runningBakery, (bakery, _, pricing) => bakeryDay(bakery, pricing)),
  gym: running(runningGym, gymDay),
  hotel: running(runningHotel, (hotel, business) => hotelDay(business, hotel)),
  factory: running(runningFactory, factoryDay),
  airline: running(runningAirline, airlineDay),
  space: running(runningSpace, spaceDay),
};

export function mechanicDay(business: OwnedBusiness, pricing: BusinessPricing): MechanicDay {
  const neutral = {
    demandBps: NO_EFFECT_BPS,
    capacityBps: NO_EFFECT_BPS,
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
  const flagship = FLAGSHIP_DAYS[pricing.definition.mechanic.kind];
  const day = { ...neutral, ...flagship(business, pricing) };
  const synergy = synergyDay(business, pricing);
  return {
    ...day,
    demandBps: (day.demandBps * synergy.demandBps) / NO_EFFECT_BPS,
    capacityBps: (day.capacityBps * synergy.capacityBps) / NO_EFFECT_BPS,
    costBps: (day.costBps * synergy.costBps) / NO_EFFECT_BPS,
  };
}
