import type { CommandResult } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';

import { changed, lookUpOwned, type BusinessOrder } from './commands';
import type { IncidentCategory } from './definition';

type InsuranceOrder = BusinessOrder & {
  readonly category: IncidentCategory;
  readonly insured: boolean;
};

export function applySetInsurance(state: GameState, order: InsuranceOrder): CommandResult {
  const found = lookUpOwned(state, order);
  if (!found.ok) return found;
  const { owned } = found;
  if (owned.stage < order.economy.rules.risks.insuranceFromStage) {
    return { ok: false, error: 'STAGE_LOCKED' };
  }
  const insurance = { ...owned.insurance, [order.category]: order.insured ? 'active' : 'none' };
  return changed(state, { ...owned, insurance });
}
