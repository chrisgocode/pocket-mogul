import type { Content } from '@/content';
import { holdsEntitlement } from '@/domain/entitlements';
import type { GameState } from '@/domain/gameState';

export type WalletSkin = 'standard' | 'golden';

export function tapMultiplier(
  state: GameState,
  tap: { readonly content: Content; readonly boosted: boolean },
): number {
  const { economy, purchases } = tap.content;
  const boost = tap.boosted ? economy.boost.tapMultiplier : 1;
  const wallet = holdsEntitlement(state, 'goldenWallet') ? purchases.goldenWalletTapMultiplier : 1;
  return boost * wallet;
}

export function walletSkin(state: GameState): WalletSkin {
  return holdsEntitlement(state, 'goldenWallet') ? 'golden' : 'standard';
}

export function offlineCapMs(state: GameState, content: Content): number {
  const standard = content.economy.time.offlineCapMs;
  return holdsEntitlement(state, 'nightManager')
    ? Math.max(standard, content.purchases.nightManagerOfflineCapMs)
    : standard;
}
