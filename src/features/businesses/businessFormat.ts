import type {
  BusinessTrack,
  IncidentCategory,
  PriceLevel,
  StaffRole,
} from '@/domain/business/definition';
import type { PolicyStatus } from '@/domain/business/owned';
import { formatMoneyExact, moneyCents, type MoneyCents } from '@/domain/money';

export const TRACK_NAMES: Readonly<Record<BusinessTrack, string>> = {
  quality: 'Quality',
  efficiency: 'Efficiency',
};

export const TRACK_EFFECTS: Readonly<Record<BusinessTrack, string>> = {
  quality: 'More customers want to buy',
  efficiency: 'Lower cost for each customer served',
};

export const ROLE_NAMES: Readonly<Record<StaffRole, string>> = {
  operations: 'Operations',
  sales: 'Sales',
  manager: 'Manager',
};

export const ROLE_EFFECTS: Readonly<Record<StaffRole, string>> = {
  operations: '+20% capacity each',
  sales: '+15% customers each',
  manager: '+10% profit and sets the best price each day',
};

export const PRICE_LEVEL_NAMES: Readonly<Record<PriceLevel, string>> = {
  budget: 'Budget',
  value: 'Value',
  standard: 'Standard',
  premium: 'Premium',
  luxury: 'Luxury',
};

const STAGE_NAMES = ['Startup', 'Local', 'Regional', 'National', 'Global'] as const;

export function stageName(stage: number): string {
  return STAGE_NAMES[stage - 1] ?? `Stage ${stage}`;
}

export function formatPerDay(cents: MoneyCents): string {
  return `${formatMoneyExact(cents)}/day`;
}

export function spent(priceCents: MoneyCents): MoneyCents {
  return moneyCents(0n - priceCents);
}

export function profitChange(from: MoneyCents, to: MoneyCents): string {
  return `${formatPerDay(from)} → ${formatPerDay(to)}`;
}

export const CATEGORY_NAMES: Readonly<Record<IncidentCategory, string>> = {
  equipment: 'Equipment',
  liability: 'Liability',
  supply: 'Supply',
};

export const POLICY_NAMES: Readonly<Record<PolicyStatus, string>> = {
  none: 'Not insured',
  active: 'Insured',
  lapsed: 'Lapsed',
};

const BPS_PER_PERCENT = 100;

export function formatChance(chanceBps: number): string {
  return `${chanceBps / BPS_PER_PERCENT}%`;
}

export function dayCount(days: number): string {
  return days === 1 ? '1 day' : `${days} days`;
}
