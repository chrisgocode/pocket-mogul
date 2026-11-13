export const CART_SPOTS = ['park', 'offices', 'campus', 'market', 'stadium'] as const;
export type CartSpot = (typeof CART_SPOTS)[number];

export const HOME_SPOT: CartSpot = 'park';

export const CROWDS = ['quiet', 'steady', 'busy'] as const;
export type Crowd = (typeof CROWDS)[number];

export const MENU_ITEMS = ['combo', 'snacks', 'express'] as const;
export type MenuItem = (typeof MENU_ITEMS)[number];

export type MenuItemRule = {
  readonly demandBps: number;
  readonly priceBps: number;
  readonly serviceBps: number;
};

export type SecondWindowRule = {
  readonly stage: number;
  readonly priceMultiple: number;
  readonly capacityPercent: number;
};

export type CrowdBps = Readonly<Record<Crowd, number>>;

export type FoodCartRules = {
  readonly unlockStage: number;
  readonly crowdChanceBps: CrowdBps;
  readonly spots: Readonly<Record<CartSpot, CrowdBps>>;
  readonly forecastDays: number;
  readonly menu: Readonly<Record<MenuItem, MenuItemRule>>;
  readonly secondWindow: SecondWindowRule;
};
