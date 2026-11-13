import type { ContractTerms } from './deliveryState';

export const PRODUCTS = ['standard', 'precision', 'custom'] as const;
export type Product = (typeof PRODUCTS)[number];

export type ProductRule = {
  readonly priceBps: number;
  readonly demandBps: number;
  readonly costBps: number;
};

export type Span = { readonly min: number; readonly max: number };

export type BulkOrderRules = {
  readonly offerDays: number;
  readonly maxOrders: number;
  readonly clients: readonly { readonly id: string; readonly name: string }[];
  readonly sizePercents: readonly number[];
  readonly rateBps: Span;
  readonly penaltyBps: number;
  readonly days: Span;
};

export type AutomationRule = {
  readonly stage: number;
  readonly priceMultiple: number;
  readonly costSavingPercent: number;
};

export type FactoryRules = {
  readonly unlockStage: number;
  readonly defaultProduct: Product;
  readonly retoolDays: number;
  readonly retoolCapacityBps: number;
  readonly products: Readonly<Record<Product, ProductRule>>;
  readonly bulk: BulkOrderRules;
  readonly automation: AutomationRule;
};

export type BulkOrder = ContractTerms & {
  readonly clientId: string;
  readonly endsDay: number;
};

export type BulkOffer = {
  readonly id: number;
  readonly clientId: string;
  readonly sizePercent: number;
  readonly rateBps: number;
  readonly days: number;
};

export type Automation = 'none' | 'installed';

export type FactoryOperation =
  | { readonly status: 'inactive' }
  | {
      readonly status: 'active';
      readonly product: Product;
      readonly retoolDaysLeft: number;
      readonly orders: readonly BulkOrder[];
      readonly answeredOffer: number;
      readonly automation: Automation;
    };

export type ActiveFactory = Extract<FactoryOperation, { status: 'active' }>;

export const NO_FACTORY: FactoryOperation = { status: 'inactive' };

export const NO_BULK_OFFER_ANSWERED = -1;
