import type { BusinessDefinition } from './business/definition';
import type { ActiveHotel, HotelRules } from './business/hotelRules';
import type { OwnedBusiness } from './business/owned';
import { dollars } from './money';
import { ownedBusiness, vendingDefinition } from './testRules';

export const hotelRules: HotelRules = {
  unlockStage: 2,
  seasonDays: 3,
  forecastSeasons: 2,
  seasonChanceBps: { low: 3000, shoulder: 3500, high: 2500, event: 1000 },
  seasonDemandBps: { low: 6500, shoulder: 10000, high: 13500, event: 18000 },
  stars: { max: 5, qualityPerStar: 5, unitsPerHousekeeper: 4, priceBpsPerStar: 400 },
  conference: { stage: 5, priceMultiple: 150, eventDemandPercent: 50 },
};

export const hotelDefinition: BusinessDefinition = {
  ...vendingDefinition,
  id: 'hotel_group',
  tier: 3,
  price: dollars('10,000,000'),
  pricePerCustomerCents: dollars('250'),
  capacityPerUnit: 8000,
  baseDemand: 8800,
  costPerCustomerCents: dollars('60'),
  upkeepPerUnitCents: dollars('320,000'),
  catalogRevenuePerDayCents: dollars('2,000,000'),
  incidents: [],
  mechanic: { kind: 'hotel', hotel: hotelRules },
};

const openHotel: ActiveHotel = {
  status: 'active',
  season: 'shoulder',
  rates: { low: 'standard', shoulder: 'standard', high: 'standard', event: 'standard' },
  conference: 'none',
};

export function hotelBusiness(
  hotel: Partial<ActiveHotel> = {},
  change: Partial<OwnedBusiness> = {},
): OwnedBusiness {
  return ownedBusiness('hotel_group', {
    stage: 2,
    capitalizedSpendCents: dollars('10,000,000'),
    hotel: { ...openHotel, ...hotel },
    ...change,
  });
}
