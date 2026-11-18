import type { Business } from '@/content';

import { stageName } from './businessFormat';

type FlagshipKind = NonNullable<Business['mechanic']>['kind'];

export type LockedText = {
  readonly title: string;
  readonly note?: string;
  readonly feature: string;
  readonly summary: string;
};

export const LOCKED_TEXT: Readonly<Record<Exclude<FlagshipKind, 'delivery'>, LockedText>> = {
  vending: {
    title: 'Locations',
    note: 'Where your machines stand and what they sell',
    feature: 'Locations and stock',
    summary: 'Place machines at five locations, pick what they sell and keep them stocked',
  },
  car_wash: {
    title: 'Washes',
    note: 'What your bays sell and who washes here',
    feature: 'Packages and memberships',
    summary: 'Choose the packages you sell, plan around the weather and sign up members',
  },
  food_cart: {
    title: 'Street',
    note: 'Where you park and what you serve',
    feature: 'Spot and menu',
    summary: 'Follow the crowds around town and choose what goes on the menu',
  },
  coffee_kiosk: {
    title: 'Counter',
    note: 'How you serve the rush and what you brew',
    feature: 'Morning rush and beans',
    summary: 'Plan for the morning rush and choose the beans you brew',
  },
  laundromat: {
    title: 'Floor',
    note: 'Which machines you run and who washes for whom',
    feature: 'Machine mix and service washes',
    summary: 'Add jumbo machines for big loads and take drop-off washes at a premium',
  },
  bakery: {
    title: 'Ovens',
    note: 'How much you bake and who you bake for',
    feature: 'Oven schedule and wholesale',
    summary: 'Set how much to bake each day and take standing orders from wholesale clients',
  },
  gym: {
    title: 'Members',
    note: 'Who trains here every day',
    feature: 'Memberships and classes',
    summary: 'Sign up members on the tier you choose and run classes to keep them',
  },
  hotel: {
    title: 'Front desk',
    note: 'What guests pay through the year',
    feature: 'Seasons and stars',
    summary: 'Plan a room rate for every season and earn stars that raise what guests pay',
  },
  factory: {
    title: 'Factory floor',
    note: 'What your lines make and who for',
    feature: 'Products and bulk orders',
    summary: 'Choose what your lines make and take large standing orders from industry',
  },
  airline: {
    title: 'Operations',
    note: 'Where your fleet flies',
    feature: 'Routes and fuel',
    summary: 'Choose the network your fleet flies and plan around the fuel price',
  },
  space: {
    title: 'Mission control',
    note: 'When you launch and for whom',
    feature: 'Launch cadence and payloads',
    summary: 'Set your launch cadence by the weather and sign payload contracts',
  },
};

export const LOCKED_DEALS: LockedText = {
  title: 'Deals',
  feature: 'Takeovers',
  summary: 'Buy a rival from the treasury and merge its units and quality',
};

export function lockedDeliveryText(locked: {
  readonly unlockStage: number;
  readonly vansPerDriver: number;
}): LockedText {
  return {
    title: 'Contracts',
    note: 'Who you deliver for and how reliably',
    feature: 'Contracts and reputation',
    summary: `Take on client contracts. From ${stageName(locked.unlockStage)}, each driver runs ${locked.vansPerDriver} vans and a van without a driver delivers nothing`,
  };
}
