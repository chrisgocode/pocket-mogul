import { holdsEntitlement } from '@/domain/entitlements';
import type { GameState } from '@/domain/gameState';

import { auctionLots, lotRedrawsOn } from './auction';
import { collectionDayOf, type CollectibleDefinition, type CollectionEconomy } from './rules';

export function lotsOnOffer(state: GameState, economy: CollectionEconomy): CollectibleDefinition[] {
  const today = collectionDayOf(state, economy.rules);
  return auctionLots({
    ...today,
    economy,
    maxTier: Math.max(...state.unlockedTiers),
    redraws: lotRedrawsOn(state.adRewards.lotRedraws, { day: today.day, economy }),
    ...(holdsEntitlement(state, 'collectorsPass') ? { pass: { held: state.collectibles } } : {}),
  });
}
