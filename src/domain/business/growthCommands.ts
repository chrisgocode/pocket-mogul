import type { CommandResult } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';

import { changed, lookUpOwned, spendTreasury, type BusinessOrder } from './commands';
import { withAirlineUnlocked } from './airline';
import { withBakeryUnlocked } from './bakery';
import { withCarWashUnlocked } from './carWash';
import { withCoffeeKioskUnlocked } from './coffeeKiosk';
import { withDeliveryUnlocked } from './delivery';
import { withFactoryUnlocked } from './factory';
import { withFoodCartUnlocked } from './foodCart';
import { withGymUnlocked } from './gym';
import { withHotelUnlocked } from './hotel';
import { withLaundromatUnlocked } from './laundromat';
import { businessDayOf, type StaffRole } from './definition';
import { quoteStaff, withStaff } from './staff';
import { quoteStage } from './stages';
import { withSpaceUnlocked } from './space';
import { withVendingUnlocked } from './vending';

type StaffOrder = BusinessOrder & { readonly role: StaffRole; readonly fromCount: number };

export function applyHireStaff(state: GameState, order: StaffOrder): CommandResult {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  const { owned, pricing } = found;
  const quote = quoteStaff(owned, { ...pricing, role: order.role });
  if (quote.status === 'locked') return { ok: false, error: 'STAGE_LOCKED' };
  if (quote.count !== order.fromCount) return { ok: false, error: 'STALE_QUOTE' };
  if (quote.status === 'at_cap') return { ok: false, error: 'AT_CAP' };
  return spendTreasury(state, {
    owned,
    priceCents: quote.signingFeeCents,
    improved: withStaff(owned, { role: order.role, count: quote.count + 1 }),
    expense: 'operating',
  });
}

export function applyFireStaff(state: GameState, order: StaffOrder): CommandResult {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  const count = found.owned.staff[order.role];
  if (count !== order.fromCount) return { ok: false, error: 'STALE_QUOTE' };
  if (count === 0) return { ok: false, error: 'INVALID_QUANTITY' };
  return changed(state, withStaff(found.owned, { role: order.role, count: count - 1 }));
}

export function applyUpgradeStage(
  state: GameState,
  order: BusinessOrder & { readonly fromStage: number },
): CommandResult {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  const { owned, pricing } = found;
  const quote = quoteStage(owned, { pricing, atMs: state.clock.simulationMs });
  if (quote.stage !== order.fromStage) return { ok: false, error: 'STALE_QUOTE' };
  if (quote.status === 'final') return { ok: false, error: 'MAX_LEVEL' };
  if (quote.status === 'not_ready') return { ok: false, error: 'STAGE_NOT_READY' };
  const start = {
    pricing,
    seed: state.market.seed,
    day: businessDayOf(state.clock.simulationMs, pricing.rules),
  };
  const staged = withVendingUnlocked({ ...owned, stage: quote.stage + 1 }, pricing);
  const washing = withLaundromatUnlocked(withCoffeeKioskUnlocked(staged, pricing), pricing);
  const training = withGymUnlocked(withBakeryUnlocked(washing, pricing), pricing);
  const upgraded = withFactoryUnlocked(training, pricing);
  const lodging = withHotelUnlocked(
    withFoodCartUnlocked(withDeliveryUnlocked(withCarWashUnlocked(upgraded, start), start), start),
    start,
  );
  return spendTreasury(state, {
    owned,
    priceCents: quote.priceCents,
    improved: withSpaceUnlocked(withAirlineUnlocked(lodging, start), start),
    expense: 'capital',
  });
}
