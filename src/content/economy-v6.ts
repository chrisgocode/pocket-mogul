import { economyV5 } from './economy-v5';
import { withMechanic } from './mechanicUpgrade';
import type { ContentInput } from './schema';

const bakeryMechanic = {
  kind: 'bakery',
  unlockStage: 2,
  bakePercents: [60, 70, 80, 90, 100],
  staleCostBps: 10000,
  wholesale: {
    offerDays: 2,
    maxOrders: 2,
    clients: [
      { id: 'corner_cafe', name: 'Corner Café' },
      { id: 'harbor_hotel', name: 'Harbor Hotel' },
      { id: 'maple_school', name: 'Maple School' },
      { id: 'greenleaf_grocer', name: 'Greenleaf Grocer' },
      { id: 'sunrise_diner', name: 'Sunrise Diner' },
      { id: 'lakeside_clinic', name: 'Lakeside Clinic' },
    ],
    sizePercents: [10, 15, 20],
    priceBps: { min: 6500, max: 8500 },
    days: { min: 4, max: 8 },
  },
  centralKitchen: { stage: 5, priceMultiple: 150, capacityPercent: 30 },
};

export const economyV6 = {
  ...economyV5,
  economyVersion: 6,
  businesses: withMechanic(economyV5.businesses, { id: 'bakery', mechanic: bakeryMechanic }),
} satisfies ContentInput;
