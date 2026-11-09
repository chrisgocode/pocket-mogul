import { exemptTaxes } from '@/domain/tax/exemption';
import { moneyCents } from '@/domain/money';
import type { BillingPort, DeliveryResult, PurchaseResult, VerifiedOwnership } from './billingPort';
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

export type GamePurchases = Omit<BillingPort, 'purchase'> & {
  readonly purchase: (productId: string) => Promise<PurchaseResult | DeliveryResult>;
  readonly recover: () => Promise<void>;
};

type DeliveryContext = { ports: GamePorts; core: Committer; policy: PurchasePolicy };

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
  if (record.completion !== 'pending' || !acceptsPurchase(context.policy, record.ownership)) return;
  const { completion } = context.ports.billing;
  if (completion.owner !== 'application') return;
  try {
    const result = await completion.complete(record.ownership);
    if (result.status !== 'completed' && result.status !== 'alreadyCompleted') return;
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

export function purchaseDelivery(ports: GamePorts, core: Committer): GamePurchases {
  const queue = serialQueue();
  const policy = ports.purchasePolicy;
  const context = policy === undefined ? undefined : { ports, core, policy };
  let active = true;
  const deliver = deliveryOperation(context, () => active);
  const recover = () =>
    queue.run(() => recoverDelivery(context, { deliver, active: () => active }));
  const unsubscribe =
    context === undefined
      ? () => undefined
      : ports.billing.subscribe(() => {
          void recover().catch(() => undefined);
        });
  return {
    ...ports.billing,
    recover,
    dispose: () => {
      active = false;
      unsubscribe();
      ports.billing.dispose();
    },
    purchase: (productId) =>
      queue.run(async () => {
        if (!active) return { status: 'unavailable' };
        const result = await ports.billing.purchase(productId);
        if (result.status !== 'completed') return result;
        const delivered = await deliver(result.ownership);
        if (context !== undefined && delivered.status === 'delivered')
          await completePending(context);
        return delivered;
      }),
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
    const evidence = await context.ports.billing.currentOwnership();
    if (evidence.status !== 'current' || !operations.active()) return;
    await evidence.ownership.reduce<Promise<void>>(async (previous, ownership) => {
      await previous;
      await operations.deliver(ownership);
    }, Promise.resolve());
    await completePending(context);
  } catch {
    return;
  }
}
