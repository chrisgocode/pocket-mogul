import type { Content } from '@/content';
import { quoteWalletUpgrade, type WalletQuote } from '@/domain/wallet';

import { affordability, type Affordability } from './affordability';
import type { TapCardView } from './tapCardView';

export type AvailableWalletUpgrade = Extract<WalletQuote, { status: 'available' }> & Affordability;

export type WalletUpgradeView = Extract<WalletQuote, { status: 'max' }> | AvailableWalletUpgrade;

export function selectWalletUpgrade(tapCard: TapCardView, content: Content): WalletUpgradeView {
  const quote = quoteWalletUpgrade(tapCard.walletLevel, content.economy.tap);
  if (quote.status === 'max') return quote;
  return { ...quote, ...affordability(quote.priceCents, tapCard.cashCents) };
}
