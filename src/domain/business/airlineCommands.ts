import type { CommandResult } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';

import { airlineRulesOf, runningAirline } from './airlineDemand';
import { quoteHub } from './airlineQuotes';
import type { Network } from './airlineRules';
import { changed, lookUpOwned, spendTreasury, type BusinessOrder } from './commands';

type NetworkOrder = BusinessOrder & { readonly network: Network };

export function applySetNetwork(state: GameState, order: NetworkOrder): CommandResult {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  const { owned, pricing } = found;
  if (airlineRulesOf(pricing) === undefined) return { ok: false, error: 'UPGRADE_UNAVAILABLE' };
  const running = runningAirline(owned, pricing);
  if (running === undefined) return { ok: false, error: 'STAGE_LOCKED' };
  const { operation } = running;
  if (order.network === operation.network) return { ok: false, error: 'INVALID_QUANTITY' };
  const airline = { ...operation, network: order.network, fleet: 'repositioning' as const };
  return changed(state, { ...owned, airline });
}

export function applyInstallHub(state: GameState, order: BusinessOrder): CommandResult {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  const { owned, pricing } = found;
  const quote = quoteHub(owned, pricing);
  if (quote === undefined) return { ok: false, error: 'UPGRADE_UNAVAILABLE' };
  if (quote.status === 'locked') return { ok: false, error: 'STAGE_LOCKED' };
  if (quote.status === 'installed') return { ok: false, error: 'MAX_LEVEL' };
  const running = runningAirline(owned, pricing);
  if (running === undefined) return { ok: false, error: 'STAGE_LOCKED' };
  return spendTreasury(state, {
    owned,
    priceCents: quote.priceCents,
    improved: { ...owned, airline: { ...running.operation, hub: 'installed' } },
    expense: 'capital',
  });
}
