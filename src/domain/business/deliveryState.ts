import type { MoneyCents } from '@/domain/money';

export type ContractTerms = {
  readonly parcelsPerDay: number;
  readonly rateCents: MoneyCents;
  readonly penaltyCents: MoneyCents;
};

export type ContractOffer = ContractTerms & {
  readonly id: string;
  readonly clientId: string;
  readonly days: number;
  readonly postedDay: number;
};

export type Contract = ContractTerms & {
  readonly id: string;
  readonly clientId: string;
  readonly endsDay: number;
};

export type DeliveryDayRecord = { readonly due: number; readonly delivered: number };

export type SortingHub = 'none' | 'installed';

export type DeliveryOperation =
  | { readonly status: 'inactive' }
  | {
      readonly status: 'active';
      readonly offers: readonly ContractOffer[];
      readonly contracts: readonly Contract[];
      readonly history: readonly DeliveryDayRecord[];
      readonly sortingHub: SortingHub;
    };

export type ActiveDelivery = Extract<DeliveryOperation, { status: 'active' }>;

export const NO_DELIVERY: DeliveryOperation = { status: 'inactive' };
