import type { AvailableAutomation } from '@/application/factoryView';
import type { Product } from '@/domain/business/factoryRules';

export const PRODUCT_NAMES: Readonly<Record<Product, string>> = {
  standard: 'Standard',
  precision: 'Precision',
  custom: 'Custom',
};

export type FactoryActions = {
  readonly setProduct: (product: Product) => void;
  readonly answerBulkOffer: (answer: { offerId: number; answer: 'accept' | 'decline' }) => void;
  readonly dismissCoachMark: () => void;
  readonly installAutomation: (automation: AvailableAutomation) => void;
};
