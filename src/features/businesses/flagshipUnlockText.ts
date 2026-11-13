import type { Business } from '@/content';
import type { FlagshipUnlock } from '@/domain/business/flagshipUnlocks';

type FlagshipKind = NonNullable<Business['mechanic']>['kind'];

const UNLOCK_NAMES: Readonly<Record<FlagshipKind, Record<'mechanic' | 'signature', string>>> = {
  vending: { mechanic: 'Locations and stock', signature: 'Card readers' },
  car_wash: { mechanic: 'Packages and memberships', signature: 'Detailing' },
  delivery: { mechanic: 'Contracts and drivers', signature: 'Sorting hub' },
  food_cart: { mechanic: 'Spot and menu', signature: 'Second window' },
  coffee_kiosk: { mechanic: 'Morning rush and beans', signature: 'Order-ahead' },
  laundromat: { mechanic: 'Machine mix and service washes', signature: 'Pickup and delivery' },
  bakery: { mechanic: 'Oven schedule and wholesale', signature: 'Central kitchen' },
  gym: { mechanic: 'Memberships and classes', signature: '24-hour access' },
  hotel: { mechanic: 'Seasons and stars', signature: 'Conference centre' },
  factory: { mechanic: 'Products and bulk orders', signature: 'Automation' },
  airline: { mechanic: 'Routes and fuel', signature: 'International hub' },
};

export function flagshipUnlockName(business: Business, unlock: FlagshipUnlock): string | undefined {
  const kind = business.mechanic?.kind;
  if (kind === undefined || unlock === 'none') return undefined;
  return UNLOCK_NAMES[kind][unlock];
}
