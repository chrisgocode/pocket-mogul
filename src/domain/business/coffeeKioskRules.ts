export const BEAN_GRADES = ['house', 'single_origin', 'reserve'] as const;
export type BeanGrade = (typeof BEAN_GRADES)[number];

export const RUSH_PLANS = ['standard', 'prebatch', 'express'] as const;
export type RushPlan = (typeof RUSH_PLANS)[number];

export type BeanGradeRule = {
  readonly priceBps: number;
  readonly demandBps: number;
  readonly costBps: number;
};

export type RushPlanRule = {
  readonly rushCapacityBps: number;
  readonly demandBps: number;
  readonly priceBps: number;
};

export type OrderAheadRule = {
  readonly stage: number;
  readonly priceMultiple: number;
  readonly rushCapacityPercent: number;
};

export type CoffeeKioskRules = {
  readonly unlockStage: number;
  readonly rushDemandBps: number;
  readonly rushWindowBps: number;
  readonly defaultGrade: BeanGrade;
  readonly defaultPlan: RushPlan;
  readonly grades: Readonly<Record<BeanGrade, BeanGradeRule>>;
  readonly plans: Readonly<Record<RushPlan, RushPlanRule>>;
  readonly orderAhead: OrderAheadRule;
};

export type OrderAhead = 'none' | 'installed';

export type CoffeeKioskOperation =
  | { readonly status: 'inactive' }
  | {
      readonly status: 'active';
      readonly grade: BeanGrade;
      readonly plan: RushPlan;
      readonly orderAhead: OrderAhead;
    };

export type ActiveCoffeeKiosk = Extract<CoffeeKioskOperation, { status: 'active' }>;

export const NO_COFFEE_KIOSK: CoffeeKioskOperation = { status: 'inactive' };
