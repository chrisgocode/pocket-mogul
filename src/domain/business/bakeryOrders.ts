export type SetBakeLevel = {
  readonly type: 'SetBakeLevel';
  readonly businessId: string;
  readonly percent: number;
};

export type AnswerWholesaleOffer = {
  readonly type: 'AnswerWholesaleOffer';
  readonly businessId: string;
  readonly offerId: number;
  readonly answer: 'accept' | 'decline';
};

export type InstallCentralKitchen = {
  readonly type: 'InstallCentralKitchen';
  readonly businessId: string;
};

export type BakeryCommand = SetBakeLevel | AnswerWholesaleOffer | InstallCentralKitchen;
