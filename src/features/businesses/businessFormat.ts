import type { BusinessTrack, PriceLevel } from '@/domain/business/definition';
import { formatMoneyExact, type MoneyCents } from '@/domain/money';

export const TRACK_NAMES: Readonly<Record<BusinessTrack, string>> = {
  quality: 'Quality',
  efficiency: 'Efficiency',
};

export const TRACK_EFFECTS: Readonly<Record<BusinessTrack, string>> = {
  quality: 'More customers want to buy',
  efficiency: 'Lower cost for each customer served',
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
