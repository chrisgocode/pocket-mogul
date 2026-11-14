import type { OwnedBusiness, RushDay } from './owned';

const BASIS_POINTS = 10_000n;

export const NO_RUSH_DAY: RushDay = { status: 'none' };

export function withRushDayProfit(business: OwnedBusiness, profitCents: bigint): bigint {
  const { rushDay } = business;
  if (rushDay.status === 'none' || profitCents <= 0n) return profitCents;
  return (profitCents * BigInt(rushDay.profitBps)) / BASIS_POINTS;
}

export function withoutEndedRushDay(business: OwnedBusiness, day: number): OwnedBusiness {
  const { rushDay } = business;
  if (rushDay.status === 'none' || rushDay.endsDay > day) return business;
  return { ...business, rushDay: NO_RUSH_DAY };
}
