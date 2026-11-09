import type {
  CheckoutResult,
  RestoreResult,
  PurchaseDriver,
  Workflow,
  GamePurchases,
} from './purchaseOperationTypes';
import type { PurchaseOperationState } from './purchaseOperationState';
import { readCheckoutGuard, saveCheckoutGuard, type CheckoutGuard } from './purchaseGuard';
import type { Committer, GamePorts } from './game';
import { serialQueue } from './serialQueue';

export type { GamePurchases } from './purchaseOperationTypes';

export function purchaseOperations(
  ports: GamePorts,
  core: Committer,
  delivery: PurchaseDriver,
): GamePurchases {
  const enabled = billingEnabled(ports);
  const workflow: Workflow = {
    state: { status: enabled ? 'initializing' : 'disabled' },
    reconciliation: 'idle',
    blocked: undefined,
    purchase: undefined,
    recovery: undefined,
    restoration: undefined,
  };
  const operations = workflowOperations({ ports, core, delivery, workflow });
  const unsubscribe = enabled
    ? ports.billing.subscribe(() => {
        void operations.ownershipChanged();
      })
    : () => undefined;
  return {
    ...operations,
    products: () =>
      disposed({ ports, core, delivery, workflow })
        ? Promise.resolve({ status: 'unavailable', products: [] })
        : delivery.products(),
    getState: () => workflow.state,
    dispose: () => {
      if (workflow.state.status === 'disposed') return;
      workflow.state = { status: 'disposed' };
      unsubscribe();
      delivery.dispose();
    },
  };
}

type Context = { ports: GamePorts; core: Committer; delivery: PurchaseDriver; workflow: Workflow };

function workflowOperations(context: Context) {
  const queue = serialQueue();
  const { workflow } = context;
  const recover = () => {
    workflow.recovery ??= queue
      .run(() => drainRecovery(context))
      .then(async () => {
        workflow.recovery = undefined;
        if (recoveryChanged(workflow) && !disposed(context)) await recover();
        return undefined;
      });
    return workflow.recovery;
  };
  return {
    recover,
    ownershipChanged: () => {
      if (workflow.recovery !== undefined) workflow.reconciliation = 'changed';
      return recover();
    },
    restore: () => {
      workflow.restoration ??= queue
        .run(async () => {
          if (workflow.state.status === 'disposed') return { status: 'unavailable' } as const;
          return restore(context);
        })
        .finally(() => {
          workflow.restoration = undefined;
        });
      return workflow.restoration;
    },
    purchase: (productId: string) => {
      workflow.purchase ??= queue
        .run(() => checkout(context, productId))
        .finally(() => {
          workflow.purchase = undefined;
        });
      return workflow.purchase;
    },
  };
}

async function checkout(context: Context, productId: string): Promise<CheckoutResult> {
  const { delivery } = context;
  if (disposed(context)) return { status: 'unavailable' };
  const prepared = await prepareCheckout(context, productId);
  if (prepared !== undefined) return prepared;
  if (disposed(context)) return { status: 'unavailable' };
  changeState(context, { status: 'purchasing', productId });
  const result = await delivery.purchase(productId);
  if (disposed(context)) return { status: 'unavailable' };
  finishCheckout(context, { productId, result });
  if (!(await persistGuard(context))) return { status: 'saveFailed' };
  if (result.status === 'unavailable' && billingEnabled(context.ports))
    await reconciled(context, await delivery.recover());
  return result;
}

function finishCheckout(
  context: Context,
  outcome: { productId: string; result: CheckoutResult },
): void {
  const { result, productId } = outcome;
  const { workflow } = context;
  diagnostic(context, { operation: 'checkout', outcome: result.status });
  if (result.status === 'pending' || result.status === 'unavailable') {
    workflow.blocked = {
      status: result.status === 'pending' ? 'pending' : 'interrupted',
      productId,
    };
    changeState(context, {
      status: result.status === 'pending' ? 'pending' : 'interrupted',
      productId,
    });
  } else {
    workflow.blocked = checkoutGuard(outcome);
    changeState(context, checkoutState(result));
  }
}

async function reconciled(context: Context, evidence: RestoreResult | undefined): Promise<void> {
  if (disposed(context)) return;
  if (evidence?.status === 'saveFailed') {
    changeState(context, { status: 'failed', reason: 'saveFailed' });
    return;
  }
  await refreshGuard(context, evidence);
  if (!(await persistGuard(context))) return;
  const blocked = context.workflow.blocked;
  if (blocked !== undefined && blocked.status !== 'delivered')
    changeState(context, { status: blocked.status, productId: blocked.productId });
  else changeState(context, reconciledState(context, evidence));
}

function updateGuard(context: Context, evidence: RestoreResult | undefined): void {
  const blocked = context.workflow.blocked;
  if (evidence?.status !== 'current' || blocked === undefined) return;
  const owned = evidence.ownership.some((item) => item.reference.productId === blocked.productId);
  if (!owned && evidence.pendingProductIds?.includes(blocked.productId) === false)
    context.workflow.blocked = undefined;
}

function changeState(context: Context, state: PurchaseOperationState): void {
  if (context.workflow.state.status === 'disposed') return;
  context.workflow.state = state;
  const details = state.status === 'failed' ? { outcome: state.reason } : { outcome: state.status };
  diagnostic(context, { ...details, operation: state.status });
}

function disposed(context: Context): boolean {
  return context.workflow.state.status === 'disposed';
}

async function restore(context: Context): Promise<RestoreResult> {
  changeState(context, { status: 'reconciling' });
  const result = await context.delivery.restore();
  await reconciled(context, result);
  return result;
}

function reconciledState(
  context: Context,
  evidence: RestoreResult | undefined,
): PurchaseOperationState {
  if (!billingEnabled(context.ports)) return { status: 'disabled' };
  if (evidence?.status === 'verificationFailed' || evidence?.status === 'saveFailed')
    return { status: 'failed', reason: evidence.status };
  return { status: evidence?.status === 'unavailable' ? 'unavailable' : 'ready' };
}

async function deliveredProduct(context: Context, productId: string): Promise<boolean> {
  if (disposed(context)) return false;
  const records = await context.core.queue.run(() =>
    context.ports.store.transact((tx) => tx.readPurchases()),
  );
  return records.some((record) => record.ownership.reference.productId === productId);
}

function billingEnabled(ports: GamePorts): boolean {
  return (ports.purchasePolicy?.products.length ?? 0) > 0;
}

async function beforeRetry(
  context: Context,
  productId: string,
): Promise<CheckoutResult | undefined> {
  if (context.workflow.blocked === undefined) return undefined;
  changeState(context, { status: 'reconciling' });
  const evidence = await context.delivery.recover();
  await reconciled(context, evidence);
  if (evidence?.status === 'saveFailed') return evidence;
  if (disposed(context)) return { status: 'unavailable' };
  if (await deliveredProduct(context, productId)) return { status: 'delivered' };
  if (context.workflow.blocked !== undefined) return { status: 'unavailable' };
  return undefined;
}

function diagnostic(context: Context, details: { operation: string; outcome: string }): void {
  if (!billingEnabled(context.ports)) return;
  const scope = context.ports.purchasePolicy?.scopes[0];
  context.core.telemetry.purchase(
    { ...details, store: scope?.store ?? 'none', environment: scope?.environment ?? 'none' },
    context.core.snapshots.get().state,
  );
}

function checkoutState(result: CheckoutResult): PurchaseOperationState {
  if (
    result.status === 'declined' ||
    result.status === 'verificationFailed' ||
    result.status === 'saveFailed'
  )
    return { status: 'failed', reason: result.status };
  return { status: result.status === 'disabled' ? 'disabled' : 'ready' };
}

function guardContext(context: Context) {
  return { ports: context.ports, core: context.core, active: () => !disposed(context) };
}

async function persistGuard(context: Context): Promise<boolean> {
  if (!billingEnabled(context.ports) || disposed(context)) return true;
  try {
    await saveCheckoutGuard(guardContext(context), context.workflow.blocked);
    return true;
  } catch {
    changeState(context, { status: 'failed', reason: 'saveFailed' });
    return false;
  }
}

async function prepareCheckout(
  context: Context,
  productId: string,
): Promise<CheckoutResult | undefined> {
  if (!billingEnabled(context.ports)) return undefined;
  try {
    context.workflow.blocked = await readCheckoutGuard(guardContext(context));
    const recovered = await beforeRetry(context, productId);
    if (recovered !== undefined) return recovered;
    context.workflow.blocked = { status: 'interrupted', productId };
    await saveCheckoutGuard(guardContext(context), context.workflow.blocked);
    return undefined;
  } catch {
    changeState(context, { status: 'failed', reason: 'saveFailed' });
    return { status: 'saveFailed' };
  }
}

function checkoutGuard(outcome: {
  productId: string;
  result: CheckoutResult;
}): CheckoutGuard | undefined {
  if (outcome.result.status === 'saveFailed')
    return { status: 'interrupted', productId: outcome.productId };
  return undefined;
}

async function refreshGuard(context: Context, evidence: RestoreResult | undefined): Promise<void> {
  const blocked = context.workflow.blocked;
  if (blocked !== undefined && (await deliveredProduct(context, blocked.productId)))
    context.workflow.blocked = { ...blocked, status: 'delivered' };
  else updateGuard(context, evidence);
}

async function recoverWorkflow(context: Context): Promise<void> {
  if (disposed(context)) return;
  try {
    context.workflow.blocked = await readCheckoutGuard(guardContext(context));
    if (disposed(context)) return;
    changeState(context, { status: 'reconciling' });
    await reconciled(context, await context.delivery.recover());
  } catch {
    changeState(context, { status: 'failed', reason: 'saveFailed' });
  }
}

async function drainRecovery(context: Context): Promise<void> {
  const { workflow } = context;
  workflow.reconciliation = 'querying';
  await recoverWorkflow(context);
  if (recoveryChanged(workflow) && !disposed(context)) return drainRecovery(context);
  workflow.reconciliation = 'idle';
}

function recoveryChanged(workflow: Workflow): boolean {
  return workflow.reconciliation === 'changed';
}
