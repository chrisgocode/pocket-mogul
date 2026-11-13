import { dollars } from '@/domain/money';

import { economyV1 } from './economy-v1';
import { foodCartMechanic } from './economy-food-cart';
import { coffeeKioskMechanic } from './economy-coffee-kiosk';
import { laundromatMechanic } from './economy-laundromat';
import { bakeryMechanic } from './economy-bakery';
import { gymMechanic } from './economy-gym-chain';
import { hotelMechanic } from './economy-hotel-group';
import { factoryMechanic } from './economy-manufacturer';
import { airlineMechanic } from './economy-airline';
import { spaceMechanic } from './economy-space-launch';
import { collection } from './economy-collection';
import { businessSynergies } from './economy-synergies';
import { withMechanics } from './mechanicUpgrade';
import type { ContentInput } from './schema';

export const economyV2 = {
  ...economyV1,
  economyVersion: 2,
  businesses: withMechanics(economyV1.businesses, {
    food_cart: foodCartMechanic,
    coffee_kiosk: coffeeKioskMechanic,
    laundromat: laundromatMechanic,
    bakery: bakeryMechanic,
    gym_chain: gymMechanic,
    hotel_group: hotelMechanic,
    manufacturer: factoryMechanic,
    airline: airlineMechanic,
    space_launch: spaceMechanic,
  }),
  synergies: businessSynergies,
  collection,
  economy: {
    ...economyV1.economy,
    taxes: {
      bands: [
        { upToCents: dollars('10000'), rateBps: 0 },
        { upToCents: dollars('100000'), rateBps: 500 },
        { upToCents: dollars('1000000'), rateBps: 1000 },
        { upToCents: dollars('10000000'), rateBps: 1500 },
      ],
      topRateBps: 2000,
      returnDays: 36,
      auditDelayMs: 600_000,
      auditChanceBps: 4000,
      fineMultiplier: 2,
      recoveryBps: 2500,
      historyReturns: 48,
    },
  },
} satisfies ContentInput;
