import type { MoneyCents } from '@/domain/money';

export const VENDING_LOCATIONS = ['office', 'gym', 'school', 'station', 'hospital'] as const;
export type VendingLocation = (typeof VENDING_LOCATIONS)[number];

export const HOME_LOCATION: VendingLocation = 'office';

export const PRODUCT_LINES = ['snacks', 'drinks', 'healthy'] as const;
export type ProductLine = (typeof PRODUCT_LINES)[number];
export type ProductSplit = Readonly<Record<ProductLine, number>>;

export const STOCK_MIXES = ['snacks', 'drinks', 'healthy', 'balanced'] as const;
export type StockMix = (typeof STOCK_MIXES)[number];

export type VendingLocationRule = {
  readonly slots: number;
  readonly trafficBps: number;
  readonly taste: ProductSplit;
  readonly restockFeePerMachineCents: MoneyCents;
};

export type CardReaderRule = {
  readonly stage: number;
  readonly priceMultiple: number;
  readonly demandPercent: number;
};

export type VendingRules = {
  readonly unlockStage: number;
  readonly defaultMix: StockMix;
  readonly stockPerMachine: number;
  readonly matchBps: { readonly poor: number; readonly perfect: number };
  readonly locations: Readonly<Record<VendingLocation, VendingLocationRule>>;
  readonly mixes: Readonly<Record<StockMix, ProductSplit>>;
  readonly cardReaders: CardReaderRule;
};

export type BusinessMechanic =
  | { readonly kind: 'shared_core' }
  | { readonly kind: 'vending'; readonly vending: VendingRules };

export const SHARED_CORE: BusinessMechanic = { kind: 'shared_core' };

export type VendingSpot = {
  readonly machines: number;
  readonly mix: StockMix;
  readonly stock: number;
};

export type VendingSpots = Readonly<Record<VendingLocation, VendingSpot>>;

export type CardReaders = 'none' | 'installed';

export type VendingOperation =
  | { readonly status: 'inactive' }
  | {
      readonly status: 'active';
      readonly spots: VendingSpots;
      readonly cardReaders: CardReaders;
    };

export type ActiveVending = Extract<VendingOperation, { status: 'active' }>;

export const NO_VENDING: VendingOperation = { status: 'inactive' };
