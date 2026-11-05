import type { Content } from '@/content';
import { moneyCents, type MoneyCents } from '@/domain/money';
import { quoteWalletUpgrade, type WalletQuote } from '@/domain/wallet';

import type { TapCardView } from './tapCardView';

export type AvailableWalletUpgrade = Extract<WalletQuote, { status: 'available' }> & {
  readonly shortfallCents: MoneyCents;
  readonly affordable: boolean;
};

export type WalletUpgradeView = Extract<WalletQuote, { status: 'max' }> | AvailableWalletUpgrade;

export function selectWalletUpgrade(tapCard: TapCardView, content: Content): WalletUpgradeView {
  const quote = quoteWalletUpgrade(tapCard.walletLevel, content.economy.tap);
  if (quote.status === 'max') return quote;
  const shortfall = quote.priceCents - tapCard.cashCents;
  const affordable = shortfall <= 0n;
  return { ...quote, affordable, shortfallCents: moneyCents(affordable ? 0n : shortfall) };
}
