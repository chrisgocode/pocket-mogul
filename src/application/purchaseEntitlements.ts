import type { Content } from '@/content';
import {
  withEntitlementSource,
  withoutEntitlementSource,
  type Entitlement,
} from '@/domain/entitlements';
import type { GameState } from '@/domain/gameState';

import { purchaseKey, type PurchaseRecord } from './purchaseLedger';
import { applyTaxEntitlement } from './taxEntitlement';

type Grant = {
  readonly entitlement: Entitlement;
  readonly status: 'verified' | 'revoked';
  readonly sourceId: string;
  readonly content: Content;
};

function applyEntitlement(state: GameState, grant: Grant): GameState {
  const { entitlement, status, sourceId, content } = grant;
  if (entitlement === 'taxExemption')
    return applyTaxEntitlement(state, {
      content,
      entitlement: { status, transactionId: sourceId },
    });
  return status === 'verified'
    ? withEntitlementSource(state, { entitlement, sourceId })
    : withoutEntitlementSource(state, { entitlement, sourceId });
}

export function applyPurchaseRecord(
  state: GameState,
  change: { readonly record: PurchaseRecord; readonly content: Content },
): GameState {
  const { record, content } = change;
  const status = record.currentOwnership?.status === 'removed' ? 'revoked' : 'verified';
  const sourceId = purchaseKey(record.ownership.reference);
  return record.entitlements.reduce(
    (previous, entitlement) =>
      applyEntitlement(previous, { entitlement, status, sourceId, content }),
    state,
  );
}

export function deliversUntaxed(record: PurchaseRecord, content: Content): boolean {
  return record.entitlements.includes('taxExemption') && content.economy.taxes === undefined;
}
