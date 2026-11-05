import type { Content } from '@/content';
import { moneyCents, type MoneyCents } from '@/domain/money';
import { quoteWalletUpgrade, type WalletQuote } from '@/domain/wallet';

import type { TapCardView } from './tapCardView';

type MaxedWallet = Extract<WalletQuote, { status: 'max' }>;
type AvailableUpgrade = Extract<WalletQuote, { status: 'available' }>;

export type WalletUpgradeView =
  | MaxedWallet
  | (AvailableUpgrade & { readonly shortfallCents: MoneyCents });

export function selectWalletUpgrade(tapCard: TapCardView, content: Content): WalletUpgradeView {
  const quote = quoteWalletUpgrade(tapCard.walletLevel, content.economy.tap);
  if (quote.status === 'max') return quote;
  const shortfall = quote.priceCents - tapCard.cashCents;
  return { ...quote, shortfallCents: moneyCents(shortfall > 0n ? shortfall : 0n) };
}
