import { moneyCents, type MoneyCents } from '@/domain/money';

import {
  INCIDENT_CATEGORIES,
  STAFF_ROLES,
  type BusinessPricing,
  type StaffRole,
} from './definition';
import type { OwnedBusiness } from './owned';

const PERCENT = 100n;

export function premiumCents(pricing: BusinessPricing): MoneyCents {
  const percent = BigInt(pricing.rules.risks.premiumPercent);
  return moneyCents((pricing.definition.catalogRevenuePerDayCents * percent) / PERCENT);
}

export function activePolicies(business: OwnedBusiness): number {
  return INCIDENT_CATEGORIES.filter((category) => business.insurance[category] === 'active').length;
}

export function wageCents(pricing: BusinessPricing, role: StaffRole): MoneyCents {
  const percent = BigInt(pricing.rules.staff.wagePercent[role]);
  return moneyCents((pricing.definition.catalogRevenuePerDayCents * percent) / PERCENT);
}

export function wagesOf(business: OwnedBusiness, pricing: BusinessPricing): bigint {
  return STAFF_ROLES.reduce<bigint>(
    (total, role) => total + wageCents(pricing, role) * BigInt(business.staff[role]),
    0n,
  );
}
