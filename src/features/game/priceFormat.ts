import { formatMoneyExact, formatRatePerMinute, type MoneyCents } from '@/domain/money';

export function formatCashChange(changeCents: MoneyCents): string {
  return changeCents > 0n ? `+${formatMoneyExact(changeCents)}` : formatMoneyExact(changeCents);
}

export function formatRateChange(from: MoneyCents, to: MoneyCents): string {
  return `${formatRatePerMinute(from, 'full')} → ${formatRatePerMinute(to, 'full')}`;
}

export function formatValueChange(from: MoneyCents, to: MoneyCents): string {
  return `${formatMoneyExact(from)} → ${formatMoneyExact(to)}`;
}

export function priceLabel(
  verb: string,
  option: { priceCents: MoneyCents; affordable: boolean; shortfallCents: MoneyCents },
): string {
  return option.affordable
    ? `${verb} · ${formatMoneyExact(option.priceCents)}`
    : `Need ${formatMoneyExact(option.shortfallCents)} more`;
}
