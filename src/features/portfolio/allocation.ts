import type { Worth } from '@/application/portfolioView';
import type { MoneyCents } from '@/domain/money';
import { colors, sectionColors } from '@/ui/tokens';

const SHARE_SCALE = 10_000n;
const PERCENT_SCALE = 100;

export type AllocationPart = { label: string; value: MoneyCents; color: string; share: number };

export function allocationParts(worth: Worth): AllocationPart[] {
  const total = worth.cashCents + worth.assetsCents;
  const share = (value: MoneyCents) =>
    total > 0n ? Number((value * SHARE_SCALE) / total) / PERCENT_SCALE : 0;
  const parts: [string, MoneyCents, string][] = [
    ['Cash', worth.cashCents, colors.textMuted],
    ['Businesses', worth.businessesCents, sectionColors.businesses],
    ['Properties', worth.propertiesCents, sectionColors.properties],
    ['Collection', worth.collectionCents, sectionColors.earn],
    ['Markets', worth.positionsCents, sectionColors.markets],
    ['Pending dividends', worth.pendingDividendsCents, sectionColors.profile],
  ];
  return parts.map(([label, value, color]) => ({ label, value, color, share: share(value) }));
}
