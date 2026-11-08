import { moneyCents } from '@/domain/money';
import type { ShareholderPayout } from './listingState';
import { TOTAL_SHARES } from './listingState';
import type { OwnedBusiness } from './owned';

const PERCENT = 100n;
const DENOMINATOR = PERCENT * TOTAL_SHARES;

export function splitListedPayout(business: OwnedBusiness, settled: bigint) {
  const { listing } = business;
  if (listing.status === 'private') return undefined;
  const payout = settled * BigInt(business.payoutPercent);
  const cash = payout * listing.sharesHeld;
  const outside = payout * (TOTAL_SHARES - listing.sharesHeld);
  const toCashCents = cash / DENOMINATOR;
  const toOutsideCents = outside / DENOMINATOR;
  return {
    toCashCents,
    toOutsideCents,
    business: {
      ...business,
      treasuryCents: moneyCents(business.treasuryCents + settled - toCashCents - toOutsideCents),
    },
  };
}

export function accumulatedPayouts(
  previous: readonly ShareholderPayout[],
  paid: readonly ShareholderPayout[],
): ShareholderPayout[] {
  const totals = new Map(previous.map((payout) => [payout.businessId, payout.paidCents]));
  for (const payout of paid)
    totals.set(
      payout.businessId,
      moneyCents((totals.get(payout.businessId) ?? 0n) + payout.paidCents),
    );
  return [...totals].map(([businessId, paidCents]) => ({ businessId, paidCents }));
}
