import type { Content } from '@/content';
import { boostedTapCents } from '@/domain/tapping';
import { quoteWalletUpgrade, type WalletQuote } from '@/domain/wallet';

import { affordability, type Affordability } from './affordability';
import type { TapCardView } from './tapCardView';

export type AvailableWalletUpgrade = Extract<WalletQuote, { status: 'available' }> & Affordability;

export type WalletUpgradeView = Extract<WalletQuote, { status: 'max' }> | AvailableWalletUpgrade;

export function selectWalletUpgrade(tapCard: TapCardView, content: Content): WalletUpgradeView {
  const quote = quoteWalletUpgrade(tapCard.walletLevel, content.economy.tap);
  const payoutCents = boostedTapCents(quote.payoutCents, tapCard.perks);
  if (quote.status === 'max') return { ...quote, payoutCents };
  return {
    ...quote,
    payoutCents,
    nextPayoutCents: boostedTapCents(quote.nextPayoutCents, tapCard.perks),
    ...affordability(quote.priceCents, tapCard.cashCents),
  };
}
