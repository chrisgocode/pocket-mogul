import type { OpenRival, RivalView, TakeoverOffer } from '@/application/takeoverView';
import type { Business } from '@/content';
import { formatMoneyExact } from '@/domain/money';

export type TakeoverChoice = { readonly rival: OpenRival; readonly offer: TakeoverOffer };

const BPS_PER_PERCENT = 100;

export function wholeChance(chanceBps: number): string {
  return `${Math.floor(chanceBps / BPS_PER_PERCENT)}%`;
}

export function unitCount(business: Business, units: number): string {
  return `${units} ${business.unitName}${units === 1 ? '' : 's'}`;
}

export function rivalFacts(business: Business, rival: RivalView): string {
  const size = `${unitCount(business, rival.units)} · Quality ${rival.quality}`;
  if (rival.status === 'merged') return size;
  return `${size} · Worth ${formatMoneyExact(rival.valuationCents)}`;
}
