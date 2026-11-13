export type WholesaleClient = { readonly id: string; readonly name: string };

export type InclusiveSpan = { readonly min: number; readonly max: number };

export type WholesaleRules = {
  readonly offerDays: number;
  readonly maxOrders: number;
  readonly clients: readonly WholesaleClient[];
  readonly sizePercents: readonly number[];
  readonly priceBps: InclusiveSpan;
  readonly days: InclusiveSpan;
};

export type CentralKitchenRule = {
  readonly stage: number;
  readonly priceMultiple: number;
  readonly capacityPercent: number;
};

export type BakeryRules = {
  readonly unlockStage: number;
  readonly bakePercents: readonly number[];
  readonly staleCostBps: number;
  readonly wholesale: WholesaleRules;
  readonly centralKitchen: CentralKitchenRule;
};

export type WholesaleOrder = {
  readonly clientId: string;
  readonly ordersPerDay: number;
  readonly priceBps: number;
  readonly endsDay: number;
};

export type WholesaleOffer = {
  readonly id: number;
  readonly clientId: string;
  readonly sizePercent: number;
  readonly priceBps: number;
  readonly days: number;
};

export type CentralKitchen = 'none' | 'installed';

export type BakeryOperation =
  | { readonly status: 'inactive' }
  | {
      readonly status: 'active';
      readonly bakePercent: number;
      readonly orders: readonly WholesaleOrder[];
      readonly answeredOffer: number;
      readonly centralKitchen: CentralKitchen;
    };

export type ActiveBakery = Extract<BakeryOperation, { status: 'active' }>;

export const NO_BAKERY: BakeryOperation = { status: 'inactive' };

export const NO_OFFER_ANSWERED = -1;
