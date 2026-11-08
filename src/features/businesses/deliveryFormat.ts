import type { AvailableSortingHub, OfferView } from '@/application/deliveryView';

const FULL_STARS = 5;

export function parcels(count: number): string {
  return count.toLocaleString('en-US');
}

export function starText(stars: number): string {
  return `${'★'.repeat(stars)}${'☆'.repeat(Math.max(0, FULL_STARS - stars))}`;
}

export function daysText(days: number): string {
  return days === 1 ? '1 day' : `${days} days`;
}

export type DeliveryActions = {
  readonly accept: (offer: OfferView) => void;
  readonly decline: (offerId: string) => void;
  readonly dismissCoachMark: () => void;
  readonly installSortingHub: (hub: AvailableSortingHub) => void;
};
