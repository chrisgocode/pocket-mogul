import { reconcileOwnership } from './purchaseReconciliation';
import {
  boundedBilling,
  preparePurchases,
  restoreCachedPurchases,
  requireActive,
} from './purchaseRecovery';
import { exemptTaxes } from '@/domain/tax/exemption';
import { moneyCents } from '@/domain/money';
import type {
  DeliveryResult,
  OwnershipResult,
  PurchaseResult,
  VerifiedOwnership,
} from './billingPort';
import type { SaveTransaction } from './ports';
import type { GameState } from '@/domain/gameState';
import type { Committed } from './commitCommand';
import type { Committer, GamePorts } from './game';
import {
  acceptsPurchase,
  purchaseKey,
  type PurchasePolicy,
  type PurchaseRecord,
} from './purchaseLedger';
import { serialQueue } from './serialQueue';
import { purchaseOperations, type GamePurchases } from './purchaseOperations';

export type { GamePurchases } from './purchaseOperations';

type DeliveryContext = {
  ports: GamePorts;
  core: Committer;
  policy: PurchasePolicy;
  active: () => boolean;
};

async function writeDelivery(
  tx: SaveTransaction,
  change: { context: DeliveryContext; ownership: VerifiedOwnership; current: GameState },
): Promise<Committed> {
  requireActive(change.context.active);
  const previous = (await tx.readPurchases()).find(
    (record) => purchaseKey(record.ownership.reference) === purchaseKey(change.ownership.reference),
  );
  if (previous !== undefined)
    return {
      outcome: { ok: true, revision: change.current.revision, cashChangeCents: moneyCents(0) },
    };
  requireActive(change.context.active);
  const rules = change.context.ports.content.economy.taxes;
  if (rules === undefined) return { outcome: { ok: false, error: 'TAX_RETURN_UNAVAILABLE' } };
  const state = {
    ...exemptTaxes(change.current, {
      transactionId: purchaseKey(change.ownership.reference),
      rules,
      dayMs: change.context.ports.content.economy.businessRules.dayMs,
    }),
    revision: change.current.revision + 1,
  };
  await tx.writeState(state);
  requireActive(change.context.active);
  await tx.writePurchase({
    ownership: change.ownership,
    benefit: 'taxExemption',
    result: { status: 'delivered' },
    completion: change.ownership.completion.owner === 'provider' ? 'completed' : 'pending',
  });
  requireActive(change.context.active);
  return {
    state,
    outcome: { ok: true, revision: state.revision, cashChangeCents: moneyCents(0) },
  };
}

async function commitDelivery(
  context: DeliveryContext,
  ownership: VerifiedOwnership,
): Promise<DeliveryResult | { status: 'unavailable' }> {
  const outcome = await context.core.commit(async (current): Promise<Committed> => {
    try {
      requireActive(context.active);
      return await context.ports.store.transact((tx) =>
        writeDelivery(tx, { context, ownership, current }),
      );
    } catch {
      return { outcome: { ok: false, error: 'SAVE_FAILED' } };
    }
  });
  if (!context.active()) return { status: 'unavailable' };
  return { status: outcome.ok ? 'delivered' : 'saveFailed' };
}

async function completeRecord(context: DeliveryContext, record: PurchaseRecord): Promise<void> {
  if (!canComplete(context, record)) return;
  const { completion } = context.ports.billing;
  if (completion.owner !== 'application') return;
  try {
    const result = await completion.complete(record.ownership);
    if (result.status === 'unavailable' || result.status === 'disabled') return;
    if (!context.active()) return;
    await context.core.queue.run(() => {
      requireActive(context.active);
      return context.ports.store.transact(async (tx) => {
        requireActive(context.active);
        await tx.writePurchase({ ...record, completion: 'completed' });
        requireActive(context.active);
      });
    });
  } catch {
    return;
  }
}

async function completePending(context: DeliveryContext): Promise<void> {
  try {
    const records = await context.core.queue.run(() =>
      context.ports.store.transact((tx) => tx.readPurchases()),
    );
    await records.reduce<Promise<void>>(async (previous, record) => {
      await previous;
      await completeRecord(context, record);
    }, Promise.resolve());
  } catch {
    return;
  }
}

export function purchaseDelivery(input: GamePorts, core: Committer): GamePurchases {
  const ports = { ...input, billing: boundedBilling(input) };
  const queue = serialQueue();
  const { purchasePolicy: policy } = ports;
  let active = true;
  const context =
    policy === undefined || policy.products.length === 0
      ? undefined
      : { ports, core, policy, active: () => active };
  const deliver = deliveryOperation(context, () => active);
  const recover = () =>
    queue.run(async () => {
      if (!active) return undefined;
      await restoreCachedPurchases(ports, { core, active: () => active });
      if (!active || context === undefined) return undefined;
      await preparePurchases(ports, () => active).catch(() => undefined);
      return recoverDelivery(context, { deliver, active: () => active });
    });
  return purchaseOperations(ports, core, {
    products: ports.billing.products,
    recover,
    restore: () =>
      queue.run(() => restoreOwnership(ports, { context, deliver, active: () => active })),
    dispose: () => {
      active = false;
      ports.billing.dispose();
    },
    purchase: (productId) =>
      queue.run(() =>
        purchaseAndDeliver(ports, { context, active: () => active, deliver }, productId),
      ),
  });
}

function deliveryOperation(context: DeliveryContext | undefined, active: () => boolean) {
  return async (
    ownership: VerifiedOwnership,
  ): Promise<DeliveryResult | { status: 'verificationFailed' | 'unavailable' }> => {
    if (
      context === undefined ||
      !active() ||
      context.ports.billing.completion.owner !== ownership.completion.owner ||
      !acceptsPurchase(context.policy, ownership)
    )
      return { status: 'verificationFailed' };
    return commitDelivery(context, ownership);
  };
}

async function recoverDelivery(
  context: DeliveryContext | undefined,
  operations: { deliver: ReturnType<typeof deliveryOperation>; active: () => boolean },
): Promise<OwnershipResult | { status: 'saveFailed' } | undefined> {
  if (context === undefined || !operations.active()) return undefined;
  try {
    await completePending(context);
    const sinceMs = context.ports.clock.wallMs();
    const evidence = await context.ports.billing.currentOwnership();
    const failed = await applyOwnership(evidence, { ...operations, context, sinceMs });
    if (failed !== undefined) return failed;
    await completePending(context);
    return evidence;
  } catch {
    return undefined;
  }
}

async function applyOwnership(
  evidence: OwnershipResult,
  operations: {
    deliver: ReturnType<typeof deliveryOperation>;
    active: () => boolean;
    sinceMs: number;
    context: DeliveryContext | undefined;
  },
): Promise<{ status: 'saveFailed' } | undefined> {
  if (
    evidence.status !== 'current' ||
    !operations.active() ||
    !freshInventory(evidence, operations.sinceMs)
  )
    return undefined;
  if (operations.context === undefined) return undefined;
  return reconcileOwnership(operations.context, evidence);
}

function freshInventory(
  evidence: Extract<OwnershipResult, { status: 'current' }>,
  sinceMs: number,
): boolean {
  return (
    evidence.authority === 'authoritative' &&
    evidence.coverage === 'complete' &&
    Number.isFinite(evidence.observedAtMs) &&
    evidence.observedAtMs >= sinceMs
  );
}

async function purchaseAndDeliver(
  ports: GamePorts,
  operation: {
    context: DeliveryContext | undefined;
    active: () => boolean;
    deliver: ReturnType<typeof deliveryOperation>;
  },
  productId: string,
): Promise<PurchaseResult | DeliveryResult> {
  if (!operation.active()) return { status: 'unavailable' };
  const result = await ports.billing.purchase(productId);
  if (result.status !== 'completed') return result;
  const delivered = await operation.deliver(result.ownership);
  if (operation.context !== undefined && delivered.status === 'delivered')
    await completePending(operation.context);
  return delivered;
}

async function restoreOwnership(
  ports: GamePorts,
  operation: {
    context: DeliveryContext | undefined;
    active: () => boolean;
    deliver: ReturnType<typeof deliveryOperation>;
  },
): Promise<OwnershipResult | { status: 'saveFailed' }> {
  if (!operation.active()) return { status: 'unavailable' };
  const sinceMs = ports.clock.wallMs();
  const evidence = await ports.billing.restore();
  const delivered = await applyOwnership(evidence, { ...operation, sinceMs });
  if (delivered !== undefined) return delivered;
  if (operation.context !== undefined && operation.active())
    await completePending(operation.context);
  return evidence;
}

function canComplete(context: DeliveryContext, record: PurchaseRecord): boolean {
  return (
    context.active() &&
    record.completion === 'pending' &&
    record.ownership.completion.owner === 'application' &&
    record.currentOwnership?.status !== 'removed' &&
    acceptsPurchase(context.policy, record.ownership)
  );
}
