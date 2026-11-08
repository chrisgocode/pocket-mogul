import type { Content } from '@/content';
import { findBusiness } from '@/domain/business/definition';
import { settleBusinesses } from '@/domain/business/treasury';
import { valuationCents } from '@/domain/business/valuation';
import type { GameState } from '@/domain/gameState';
import { moneyCents } from '@/domain/money';

import { businessEconomy } from './economy';

export function listingValuesAt(previous: GameState, content: Content) {
  const economy = businessEconomy(content);
  return (businessId: string, tick: number) => {
    const owned = previous.businesses.find((business) => business.definitionId === businessId);
    const definition = findBusiness(economy.catalog, businessId);
    if (owned === undefined || definition === undefined) return moneyCents(0);
    const settled = settleBusinesses([owned], {
      fromMs: previous.clock.simulationMs,
      elapsedMs: Math.max(0, tick * content.economy.market.tickMs - previous.clock.simulationMs),
      economy,
      seed: previous.market.seed,
    }).businesses[0];
    return valuationCents(settled ?? owned, { definition, rules: economy.rules });
  };
}
