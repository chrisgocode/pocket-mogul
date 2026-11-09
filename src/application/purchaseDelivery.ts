import { boundedBilling, preparePurchases, restoreCachedPurchases } from './purchaseRecovery';
import { exemptTaxes } from '@/domain/tax/exemption';
import { moneyCents } from '@/domain/money';
import type {
  BillingPort,
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

export type GamePurchases = Omit<BillingPort, 'purchase' | 'restore'> & {
  readonly purchase: (productId: string) => Promise<PurchaseResult | DeliveryResult>;
  readonly restore: () => Promise<OwnershipResult | { status: 'saveFailed' }>;
  readonly recover: () => Promise<void>;
};

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
  const previous = (await tx.readPurchases()).find(
    (record) => purchaseKey(record.ownership.reference) === purchaseKey(change.ownership.reference),
  );
  if (previous !== undefined)
    return {
      outcome: { ok: true, revision: change.current.revision, cashChangeCents: moneyCents(0) },
    };
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
  await tx.writePurchase({
    ownership: change.ownership,
    benefit: 'taxExemption',
    result: { status: 'delivered' },
    completion: 'pending',
  });
  return {
    state,
    outcome: { ok: true, revision: state.revision, cashChangeCents: moneyCents(0) },
  };
}

async function commitDelivery(
  context: DeliveryContext,
  ownership: VerifiedOwnership,
): Promise<DeliveryResult> {
  const outcome = await context.core.commit(async (current): Promise<Committed> => {
    try {
      return await context.ports.store.transact((tx) =>
        writeDelivery(tx, { context, ownership, current }),
      );
    } catch {
      return { outcome: { ok: false, error: 'SAVE_FAILED' } };
    }
  });
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
    await context.core.queue.run(() =>
      context.ports.store.transact((tx) =>
        tx.writePurchase({ ...record, completion: 'completed' }),
      ),
    );
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
  const policy = ports.purchasePolicy;
  let active = true;
  const context =
    policy === undefined || policy.products.length === 0
      ? undefined
      : { ports, core, policy, active: () => active };
  const deliver = deliveryOperation(context, () => active);
  const recover = () =>
    queue.run(async () => {
      if (!active) return;
      await restoreCachedPurchases(ports, core);
      if (context === undefined) return;
      await preparePurchases(ports, () => active).catch(() => undefined);
      await recoverDelivery(context, { deliver, active: () => active });
    });
  const unsubscribe =
    context === undefined
      ? () => undefined
      : ports.billing.subscribe(() => {
          void recover().catch(() => undefined);
        });
  return {
    ...ports.billing,
    recover,
    restore: () =>
      queue.run(() => restoreOwnership(ports, { context, deliver, active: () => active })),
    dispose: () => {
      active = false;
      unsubscribe();
      ports.billing.dispose();
    },
    purchase: (productId) =>
      queue.run(() =>
        purchaseAndDeliver(ports, { context, active: () => active, deliver }, productId),
      ),
  };
}

function deliveryOperation(context: DeliveryContext | undefined, active: () => boolean) {
  return async (
    ownership: VerifiedOwnership,
  ): Promise<DeliveryResult | { status: 'verificationFailed' }> => {
    if (
      context === undefined ||
      !active() ||
      context.ports.billing.completion.owner !== 'application' ||
      !acceptsPurchase(context.policy, ownership)
    )
      return { status: 'verificationFailed' };
    return commitDelivery(context, ownership);
  };
}

async function recoverDelivery(
  context: DeliveryContext | undefined,
  operations: { deliver: ReturnType<typeof deliveryOperation>; active: () => boolean },
): Promise<void> {
  if (context === undefined || !operations.active()) return;
  try {
    await completePending(context);
    const sinceMs = context.ports.clock.wallMs();
    const evidence = await context.ports.billing.currentOwnership();
    await applyOwnership(evidence, { ...operations, sinceMs });
    await completePending(context);
  } catch {
    return;
  }
}

async function applyOwnership(
  evidence: OwnershipResult,
  operations: {
    deliver: ReturnType<typeof deliveryOperation>;
    active: () => boolean;
    sinceMs: number;
  },
): Promise<{ status: 'saveFailed' } | undefined> {
  if (
    evidence.status !== 'current' ||
    !operations.active() ||
    !freshInventory(evidence, operations.sinceMs)
  )
    return undefined;
  return evidence.ownership.reduce<Promise<{ status: 'saveFailed' } | undefined>>(
    async (previous, ownership) => {
      const failed = await previous;
      if (failed !== undefined) return failed;
      const result = await operations.deliver(ownership);
      return result.status === 'saveFailed' ? result : undefined;
    },
    Promise.resolve(undefined),
  );
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
    acceptsPurchase(context.policy, record.ownership)
  );
}
