import { moneyCents, type MoneyCents } from '@/domain/money';

import {
  businessDayOf,
  NO_STAFF,
  type BusinessDefinition,
  type BusinessRules,
  type BusinessTrack,
  type PriceLevel,
  type StaffCounts,
} from './definition';

export type BusinessStatus = 'open' | 'closed';

export type OwnedBusiness = {
  readonly definitionId: string;
  readonly stage: number;
  readonly units: number;
  readonly priceLevel: PriceLevel;
  readonly levels: Readonly<Record<BusinessTrack, number>>;
  readonly staff: StaffCounts;
  readonly payoutPercent: number;
  readonly treasuryCents: MoneyCents;
  readonly profitRemainder: number;
  readonly payoutRemainder: number;
  readonly status: BusinessStatus;
  readonly purchasedDay: number;
  readonly capitalizedSpendCents: MoneyCents;
};

const FIRST_STAGE = 1;

export function newBusiness(
  definition: BusinessDefinition,
  opening: { readonly rules: BusinessRules; readonly atMs: number },
): OwnedBusiness {
  return {
    definitionId: definition.id,
    stage: FIRST_STAGE,
    units: 1,
    priceLevel: opening.rules.defaultPriceLevel,
    levels: { quality: 0, efficiency: 0 },
    staff: NO_STAFF,
    payoutPercent: opening.rules.defaultPayoutPercent,
    treasuryCents: moneyCents(0),
    profitRemainder: 0,
    payoutRemainder: 0,
    status: 'open',
    purchasedDay: businessDayOf(opening.atMs, opening.rules),
    capitalizedSpendCents: definition.price,
  };
}
