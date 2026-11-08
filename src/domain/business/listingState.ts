import type { MoneyCents, QuantityMicrounits } from '@/domain/money';

export const LISTING_READER_VERSION = 3;
export const LISTING_STAGE = 4;
const FLOAT_STEP_PERCENT = 10;
const FLOAT_CHOICES = 4;
export const FLOAT_PERCENTS = Array.from(
  { length: FLOAT_CHOICES },
  (_, index) => (index + 1) * FLOAT_STEP_PERCENT,
);
export const TOTAL_SHARES = 1_000_000_000_000n;
export const SHARE_PERCENT = TOTAL_SHARES / 100n;
export const listingId = (businessId: string) => `listing:${businessId}`;

export type Listing =
  | { readonly status: 'private' }
  | {
      readonly status: 'listed';
      readonly ticker: string;
      readonly sharesHeld: QuantityMicrounits;
    };

export type ShareholderPayout = {
  readonly businessId: string;
  readonly paidCents: MoneyCents;
};
