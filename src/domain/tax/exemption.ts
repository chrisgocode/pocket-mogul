import type { GameState } from '@/domain/gameState';

import { startTaxLedger } from './ledger';
import { TAX_READER_VERSION, type TaxRules } from './types';

export type VerifiedTaxEntitlement =
  | { readonly status: 'unavailable' }
  | { readonly status: 'verified'; readonly transactionId: string }
  | { readonly status: 'revoked'; readonly transactionId: string };

export function exemptTaxes(
  state: GameState,
  change: { transactionId: string; dayMs: number; rules: TaxRules },
): GameState {
  const previous =
    state.tax.status === 'notStarted'
      ? startTaxLedger(
          {
            atMs: state.clock.simulationMs,
            wealthCents: state.peakNetWorthCents,
            dayMs: change.dayMs,
          },
          change.rules,
        )
      : state.tax;
  if (previous.status === 'exempt' && previous.entitlementIds.includes(change.transactionId))
    return state;
  return {
    ...state,
    minReaderVersion: Math.max(state.minReaderVersion, TAX_READER_VERSION),
    tax: {
      ...previous,
      status: 'exempt',
      lines: [],
      pools: {},
      debts: [],
      returns: previous.returns.map((r) => ({
        ...r,
        filing:
          r.filing.status === 'unfiled' || r.filing.status === 'pendingAudit'
            ? { status: 'waived' }
            : r.filing,
      })),
      entitlementIds: [...new Set([...previous.entitlementIds, change.transactionId])],
    },
  };
}
