import { activationBasis } from './taxActivation';
import { netWorthBreakdown } from '@/domain/progression';
import { progressRules } from './economy';
import { taxRateBps } from '@/domain/tax/assessment';
import type { Content } from '@/content';
import type { GameState } from '@/domain/gameState';
import { moneyCents } from '@/domain/money';
import { exemptTaxes, type VerifiedTaxEntitlement } from '@/domain/tax/exemption';

import type { Committed } from './commitCommand';
import type { SaveStore } from './ports';

export type TaxEntitlementPort = { readonly current: () => Promise<VerifiedTaxEntitlement> };

function applyTaxEntitlement(
  state: GameState,
  change: { entitlement: VerifiedTaxEntitlement; content: Content },
): GameState {
  const { entitlement, content } = change;
  const rules = content.economy.taxes;
  if (entitlement.status === 'unavailable' || rules === undefined) return state;
  if (entitlement.status === 'verified')
    return exemptTaxes(state, {
      transactionId: entitlement.transactionId,
      dayMs: content.economy.businessRules.dayMs,
      rules,
    });
  if (
    state.tax.status !== 'exempt' ||
    !state.tax.entitlementIds.includes(entitlement.transactionId)
  )
    return state;
  return revokedExemption(state, content);
}

export async function commitTaxEntitlement(
  context: { store: SaveStore; content: Content },
  change: { current: GameState; entitlement: VerifiedTaxEntitlement },
): Promise<Committed> {
  const updated = applyTaxEntitlement(change.current, { ...change, content: context.content });
  const state =
    updated === change.current ? updated : { ...updated, revision: updated.revision + 1 };
  const outcome = { ok: true, revision: state.revision, cashChangeCents: moneyCents(0) } as const;
  try {
    await context.store.transact((tx) => tx.writeState(state));
    return { state, outcome };
  } catch {
    return { outcome: { ok: false, error: 'SAVE_FAILED' } };
  }
}

function revokedExemption(state: GameState, content: Content): GameState {
  if (state.tax.status !== 'exempt' || content.economy.taxes === undefined) return state;
  const dayMs = content.economy.businessRules.dayMs;
  const dayEndsMs = (Math.floor(state.clock.simulationMs / dayMs) + 1) * dayMs;
  const wealth = netWorthBreakdown(state, progressRules(content)).netWorthCents;
  return {
    ...state,
    tax: {
      ...state.tax,
      status: 'active',
      dayEndsMs,
      returnStartedAtMs: state.clock.simulationMs,
      returnEndsMs: dayEndsMs + dayMs * (content.economy.taxes.returnDays - 1),
      openingWealthCents: wealth,
      rateBps: taxRateBps(wealth, content.economy.taxes),
      basis: activationBasis(state, content),
      pools: {},
      lines: [],
      recoveryRemainder: 0n,
    },
  };
}
