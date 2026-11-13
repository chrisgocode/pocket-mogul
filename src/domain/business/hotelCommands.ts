import type { CommandResult } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';

import { changed, lookUpOwned, spendTreasury, type BusinessOrder } from './commands';
import type { PriceLevel } from './definition';
import { hotelRulesOf, runningHotel } from './hotelDemand';
import { quoteConference } from './hotelQuotes';
import type { Season } from './hotelRules';

type RateOrder = BusinessOrder & { readonly season: Season; readonly priceLevel: PriceLevel };

export function applySetSeasonRate(state: GameState, order: RateOrder): CommandResult {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  const { owned, pricing } = found;
  if (hotelRulesOf(pricing) === undefined) return { ok: false, error: 'UPGRADE_UNAVAILABLE' };
  const running = runningHotel(owned, pricing);
  if (running === undefined) return { ok: false, error: 'STAGE_LOCKED' };
  const { operation } = running;
  const rates = { ...operation.rates, [order.season]: order.priceLevel };
  const priceLevel = order.season === operation.season ? order.priceLevel : owned.priceLevel;
  return changed(state, { ...owned, priceLevel, hotel: { ...operation, rates } });
}

export function applyInstallConference(state: GameState, order: BusinessOrder): CommandResult {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  const { owned, pricing } = found;
  const quote = quoteConference(owned, pricing);
  if (quote === undefined) return { ok: false, error: 'UPGRADE_UNAVAILABLE' };
  if (quote.status === 'locked') return { ok: false, error: 'STAGE_LOCKED' };
  if (quote.status === 'installed') return { ok: false, error: 'MAX_LEVEL' };
  const running = runningHotel(owned, pricing);
  if (running === undefined) return { ok: false, error: 'STAGE_LOCKED' };
  return spendTreasury(state, {
    owned,
    priceCents: quote.priceCents,
    improved: { ...owned, hotel: { ...running.operation, conference: 'installed' } },
    expense: 'capital',
  });
}
