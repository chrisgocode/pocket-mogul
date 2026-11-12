import type { AvailableOrderAhead } from '@/application/coffeeKioskView';
import type { BeanGrade, RushPlan } from '@/domain/business/coffeeKioskRules';

export const GRADE_NAMES: Readonly<Record<BeanGrade, string>> = {
  house: 'House',
  single_origin: 'Single origin',
  reserve: 'Reserve',
};

export const PLAN_NAMES: Readonly<Record<RushPlan, string>> = {
  standard: 'Standard',
  prebatch: 'Pre-batch',
  express: 'Express menu',
};

export const PLAN_NOTES: Readonly<Record<RushPlan, string>> = {
  standard: 'Every cup made to order',
  prebatch: 'Brew ahead: a faster rush, and a few customers notice',
  express: 'A short menu at a lower price: the fastest rush',
};

export type CoffeeKioskActions = {
  readonly setGrade: (grade: BeanGrade) => void;
  readonly setPlan: (plan: RushPlan) => void;
  readonly dismissCoachMark: () => void;
  readonly installOrderAhead: (orderAhead: AvailableOrderAhead) => void;
};
