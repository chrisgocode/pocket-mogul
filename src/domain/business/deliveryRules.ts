export type DrawRange = { readonly min: number; readonly max: number };

export type DeliveryClient = { readonly id: string; readonly name: string };

export type ContractOfferRules = {
  readonly boardSize: number;
  readonly expiryDays: number;
  readonly clients: readonly DeliveryClient[];
  readonly fleetSharePercent: DrawRange;
  readonly ratePercent: DrawRange;
  readonly penaltyPercent: DrawRange;
  readonly days: DrawRange;
  readonly parcelStep: number;
};

export type StarRule = {
  readonly minOnTimeBps: number;
  readonly offerSizeBps: number;
  readonly offerRateBps: number;
};

export type ReputationRules = {
  readonly windowDays: number;
  readonly startingStars: number;
  readonly stars: readonly StarRule[];
};

export type SortingHubRule = {
  readonly stage: number;
  readonly priceMultiple: number;
  readonly capacityPercent: number;
};

export type DeliveryRules = {
  readonly unlockStage: number;
  readonly vansPerDriver: number;
  readonly routePlannerPercent: number;
  readonly offers: ContractOfferRules;
  readonly reputation: ReputationRules;
  readonly sortingHub: SortingHubRule;
};
