import type { UpgradeTrack } from '@/domain/businessQuotes';
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
