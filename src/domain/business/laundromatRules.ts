export type JumboRule = {
  readonly customerShareBps: number;
  readonly speedBps: number;
  readonly priceBps: number;
  readonly sharePercents: readonly number[];
};

export type ServiceWashRule = {
  readonly loadsPercentPerLevel: number;
  readonly priceBpsByLevel: readonly number[];
};

export type PickupRule = {
  readonly stage: number;
  readonly priceMultiple: number;
  readonly demandPercent: number;
};

export type LaundromatRules = {
  readonly unlockStage: number;
  readonly jumbo: JumboRule;
  readonly service: ServiceWashRule;
  readonly pickup: PickupRule;
};

export type Pickup = 'none' | 'installed';

export type LaundromatOperation =
  | { readonly status: 'inactive' }
  | {
      readonly status: 'active';
      readonly jumboPercent: number;
      readonly serviceLevel: number;
      readonly pickup: Pickup;
    };

export type ActiveLaundromat = Extract<LaundromatOperation, { status: 'active' }>;

export const NO_LAUNDROMAT: LaundromatOperation = { status: 'inactive' };
