import type { Product } from './factoryRules';

export type SetProduct = {
  readonly type: 'SetProduct';
  readonly businessId: string;
  readonly product: Product;
};

export type AnswerBulkOffer = {
  readonly type: 'AnswerBulkOffer';
  readonly businessId: string;
  readonly offerId: number;
  readonly answer: 'accept' | 'decline';
};

export type InstallAutomation = {
  readonly type: 'InstallAutomation';
  readonly businessId: string;
};

export type FactoryCommand = SetProduct | AnswerBulkOffer | InstallAutomation;
