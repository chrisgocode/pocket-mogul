import type { UpgradeTrack } from '@/domain/businessQuotes';
import { formatMoneyExact, formatRatePerMinute, type MoneyCents } from '@/domain/money';

const BASIS_POINTS_PER_PERCENT = 100;

export const TRACK_NAMES: Readonly<Record<UpgradeTrack, string>> = {
  capacity: 'Capacity',
  quality: 'Quality',
  efficiency: 'Efficiency',
};

export const TRACK_EFFECTS: Readonly<Record<UpgradeTrack, string>> = {
  capacity: 'More revenue, higher operating costs',
  quality: 'More revenue',
  efficiency: 'Lower operating costs',
};

export function formatBonus(bonusBps: number): string {
  return `+${bonusBps / BASIS_POINTS_PER_PERCENT}%`;
}

export function formatCashChange(changeCents: MoneyCents): string {
  return changeCents > 0n ? `+${formatMoneyExact(changeCents)}` : formatMoneyExact(changeCents);
}

export function formatRateChange(from: MoneyCents, to: MoneyCents): string {
  return `${formatRatePerMinute(from, 'full')} → ${formatRatePerMinute(to, 'full')}`;
}

export function priceLabel(
  verb: string,
  option: { priceCents: MoneyCents; affordable: boolean; shortfallCents: MoneyCents },
): string {
  return option.affordable
    ? `${verb} · ${formatMoneyExact(option.priceCents)}`
    : `Need ${formatMoneyExact(option.shortfallCents)} more`;
}
