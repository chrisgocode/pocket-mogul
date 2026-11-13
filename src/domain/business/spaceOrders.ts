import type { Cadence } from './spaceRules';

export type SetCadence = {
  readonly type: 'SetCadence';
  readonly businessId: string;
  readonly cadence: Cadence;
};

export type AnswerPayloadOffer = {
  readonly type: 'AnswerPayloadOffer';
  readonly businessId: string;
  readonly offerId: number;
  readonly answer: 'accept' | 'decline';
};

export type InstallBoosters = {
  readonly type: 'InstallBoosters';
  readonly businessId: string;
};

export type SpaceCommand = SetCadence | AnswerPayloadOffer | InstallBoosters;
