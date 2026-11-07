import { moneyCents, type MoneyCents } from '@/domain/money';

import { bestPriceLevel, profitPerDayCents, wageCents } from './core';
import { stageRule, type BusinessPricing, type StaffRole } from './definition';
import type { OwnedBusiness } from './owned';

export type StaffQuote =
  | { readonly status: 'locked'; readonly role: StaffRole; readonly unlockStage: number }
  | {
      readonly status: 'at_cap';
      readonly role: StaffRole;
      readonly count: number;
      readonly cap: number;
      readonly wageCents: MoneyCents;
    }
  | {
      readonly status: 'available';
      readonly role: StaffRole;
      readonly count: number;
      readonly cap: number;
      readonly wageCents: MoneyCents;
      readonly signingFeeCents: MoneyCents;
      readonly profitCents: MoneyCents;
      readonly nextProfitCents: MoneyCents;
    };

function staffCap(business: OwnedBusiness, pricing: BusinessPricing, role: StaffRole) {
  return stageRule(pricing.rules, business.stage)?.staffCap[role] ?? 0;
}

function unlockStage(pricing: BusinessPricing, role: StaffRole): number {
  return pricing.rules.stages.findIndex((stage) => stage.staffCap[role] > 0) + 1;
}

export function withStaff(business: OwnedBusiness, change: { role: StaffRole; count: number }) {
  return { ...business, staff: { ...business.staff, [change.role]: change.count } };
}

export function quoteStaff(
  business: OwnedBusiness,
  staffing: BusinessPricing & { readonly role: StaffRole },
): StaffQuote {
  const { role, rules } = staffing;
  const cap = staffCap(business, staffing, role);
  const count = business.staff[role];
  if (cap === 0 && count === 0)
    return { status: 'locked', role, unlockStage: unlockStage(staffing, role) };
  const wage = wageCents(staffing, role);
  if (count >= cap) return { status: 'at_cap', role, count, cap, wageCents: wage };
  return {
    status: 'available',
    role,
    count,
    cap,
    wageCents: wage,
    signingFeeCents: moneyCents(wage * BigInt(rules.staff.signingFeeDays)),
    profitCents: profitPerDayCents(business, staffing),
    nextProfitCents: profitPerDayCents(withStaff(business, { role, count: count + 1 }), staffing),
  };
}

export function managerDecisions(business: OwnedBusiness, pricing: BusinessPricing): OwnedBusiness {
  if (business.staff.manager === 0 || business.status === 'closed') return business;
  return { ...business, priceLevel: bestPriceLevel(business, pricing) };
}
