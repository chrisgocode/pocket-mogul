import type { OwnershipResult } from './billingPort';
import { applyEnvelope, type Committed, type CommandTime } from './commitCommand';
import type { Committer, GamePorts } from './game';
import type { SaveTransaction } from './ports';
import {
  acceptsPurchase,
  authorizesPurchaseScope,
  purchaseKey,
  type PurchasePolicy,
  type PurchaseRecord,
} from './purchaseLedger';
import { requireActive } from './purchaseRecovery';
import { applyTaxEntitlement } from './taxEntitlement';
import type { GameState } from '@/domain/gameState';
import { moneyCents } from '@/domain/money';

type Inventory = Extract<OwnershipResult, { status: 'current' }>;
type Context = { ports: GamePorts; core: Committer; policy: PurchasePolicy; active: () => boolean };

function newer(record: PurchaseRecord, evidence: Inventory, status: 'active' | 'removed'): boolean {
  const observed =
    record.currentOwnership?.observedAtMs ?? record.ownership.verification.verifiedAtMs;
  return (
    evidence.observedAtMs > observed ||
    (evidence.observedAtMs === observed &&
      (status === 'removed' || record.currentOwnership?.status !== 'removed'))
  );
}

function reconcileRecords(
  records: readonly PurchaseRecord[],
  evidence: Inventory,
  context: Context,
) {
  const { policy } = context;
  const updated = new Map(
    records.map((record) => [purchaseKey(record.ownership.reference), record]),
  );
  const candidates =
    context.ports.billing.completion.owner === 'application' ? evidence.ownership : [];
  for (const ownership of candidates) {
    if (!acceptsPurchase(policy, ownership)) continue;
    const key = purchaseKey(ownership.reference);
    const previous = updated.get(key);
    if (previous !== undefined && !newer(previous, evidence, 'active')) continue;
    updated.set(key, {
      ...(previous ?? {
        benefit: 'taxExemption',
        result: { status: 'delivered' },
        completion: 'pending',
      }),
      ownership,
      currentOwnership: { status: 'active', observedAtMs: evidence.observedAtMs },
    });
  }
  removeRecords(updated, evidence, policy);
  return [...updated.values()];
}

function removeRecords(
  updated: Map<string, PurchaseRecord>,
  evidence: Inventory,
  policy: PurchasePolicy,
): void {
  for (const reference of evidence.removals) {
    const key = purchaseKey(reference);
    const previous = updated.get(key);
    if (previous === undefined || !authorizesPurchaseScope(policy, reference)) continue;
    if (
      previous.ownership.reference.productId !== reference.productId ||
      !newer(previous, evidence, 'removed')
    )
      continue;
    updated.set(key, {
      ...previous,
      currentOwnership: { status: 'removed', observedAtMs: evidence.observedAtMs },
    });
  }
}

function project(
  state: GameState,
  records: readonly PurchaseRecord[],
  context: Context,
): GameState {
  const ordered = [
    ...records.filter((record) => record.currentOwnership?.status !== 'removed'),
    ...records.filter((record) => record.currentOwnership?.status === 'removed'),
  ];
  return ordered.reduce(
    (previous, record) =>
      applyTaxEntitlement(previous, {
        content: context.ports.content,
        entitlement: {
          status: record.currentOwnership?.status === 'removed' ? 'revoked' : 'verified',
          transactionId: purchaseKey(record.ownership.reference),
        },
      }),
    state,
  );
}

async function writeInventory(
  tx: SaveTransaction,
  context: Context,
  change: {
    current: GameState;
    evidence: Inventory;
    time: CommandTime;
  },
): Promise<Committed> {
  requireActive(context.active);
  const records = await tx.readPurchases();
  const updated = reconcileRecords(records, change.evidence, context);
  const authorized = updated.filter((record) =>
    authorizesPurchaseScope(context.policy, record.ownership.reference),
  );
  const settled = settleBeforeRemoval(context, {
    current: change.current,
    time: change.time,
    records,
    updated: authorized,
  });
  const before = settled?.state ?? change.current;
  const projected = project(before, authorized, context);
  const committed = committedProjection(change.current, projected, settled);
  await persistInventory(tx, updated, committed);
  requireActive(context.active);
  return committed;
}

function committedProjection(
  current: GameState,
  projected: GameState,
  settled: Committed | undefined,
): Committed {
  const state =
    projected === current ? undefined : { ...projected, revision: current.revision + 1 };
  return {
    ...settled,
    ...(state === undefined ? {} : { state }),
    outcome: {
      ok: true,
      revision: state?.revision ?? current.revision,
      cashChangeCents:
        settled?.outcome.ok === true ? settled.outcome.cashChangeCents : moneyCents(0),
    },
  };
}

function settleBeforeRemoval(
  context: Context,
  change: {
    current: GameState;
    time: CommandTime;
    records: readonly PurchaseRecord[];
    updated: readonly PurchaseRecord[];
  },
): Committed | undefined {
  const removed = change.updated.some(
    (record) =>
      record.currentOwnership?.status === 'removed' &&
      change.records.find(
        (old) => purchaseKey(old.ownership.reference) === purchaseKey(record.ownership.reference),
      )?.currentOwnership?.status !== 'removed',
  );
  if (!removed) return undefined;
  return applyEnvelope(change.current, {
    envelope: { id: 'purchase-removal', command: { type: 'SettleOffline' } },
    time: change.time,
    economies: context.ports,
  });
}

async function persistInventory(
  tx: SaveTransaction,
  records: readonly PurchaseRecord[],
  committed: Committed,
): Promise<void> {
  await records.reduce<Promise<void>>(async (previous, record) => {
    await previous;
    await tx.writePurchase(record);
  }, Promise.resolve());
  if (committed.state !== undefined) await tx.writeState(committed.state);
  if (committed.history !== undefined) await tx.appendMarketHistory(committed.history);
  if (committed.activity !== undefined) await tx.appendActivity(committed.activity);
}

export async function reconcileOwnership(
  context: Context,
  evidence: Inventory,
): Promise<{ status: 'saveFailed' } | undefined> {
  const result = await context.core.commit(async (current, time) => {
    try {
      return await context.ports.store.transact((tx) =>
        writeInventory(tx, context, { current, time, evidence }),
      );
    } catch {
      return { outcome: { ok: false, error: 'SAVE_FAILED' } };
    }
  });
  return result.ok ? undefined : { status: 'saveFailed' };
}
