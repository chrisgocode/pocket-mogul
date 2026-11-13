import type { BeanGrade, RushPlan } from './coffeeKioskRules';

export type SetBeanGrade = {
  readonly type: 'SetBeanGrade';
  readonly businessId: string;
  readonly grade: BeanGrade;
};

export type SetRushPlan = {
  readonly type: 'SetRushPlan';
  readonly businessId: string;
  readonly plan: RushPlan;
};

export type InstallOrderAhead = {
  readonly type: 'InstallOrderAhead';
  readonly businessId: string;
};

export type CoffeeKioskCommand = SetBeanGrade | SetRushPlan | InstallOrderAhead;
