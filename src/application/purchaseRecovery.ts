import { exemptTaxes } from '@/domain/tax/exemption';
import { authorizesPurchaseScope, purchaseKey } from './purchaseLedger';
import { moneyCents } from '@/domain/money';
import type { BillingPort } from './billingPort';
import type { Committer, GamePorts } from './game';

const PROVIDER_WAIT_MS = 2_000;

function bounded<T>(ports: GamePorts, work: () => Promise<T>, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const cancel = ports.clock.schedule(PROVIDER_WAIT_MS, () => resolve(fallback));
    void Promise.resolve()
      .then(work)
      .then(
        (result) => {
          cancel();
          return resolve(result);
        },
        () => {
          cancel();
          return resolve(fallback);
        },
      );
  });
}

export function boundedBilling(ports: GamePorts): BillingPort {
  const billing = ports.billing;
  let initialization: ReturnType<BillingPort['initialize']> | undefined;
  return {
    ...billing,
    initialize: (identity) => {
      initialization ??= bounded(ports, () => billing.initialize(identity), {
        status: 'unavailable',
      });
      return initialization;
    },
    currentOwnership: () => bounded(ports, billing.currentOwnership, { status: 'unavailable' }),
    restore: () => bounded(ports, billing.restore, { status: 'unavailable' }),
    completion:
      billing.completion.owner === 'provider'
        ? billing.completion
        : {
            owner: 'application',
            complete: (ownership) => {
              const completion = billing.completion;
              if (completion.owner !== 'application')
                return Promise.resolve({ status: 'unavailable' });
              return bounded(ports, () => completion.complete(ownership), {
                status: 'unavailable',
              });
            },
          },
  };
}

export async function preparePurchases(ports: GamePorts, active: () => boolean): Promise<void> {
  const identity = await ports.store.transact(async (tx) => {
    const saved = await tx.readPurchaseIdentity();
    if (saved !== undefined) return saved;
    const created = { id: ports.createId() };
    await tx.writePurchaseIdentity(created);
    return created;
  });
  const initialized = await ports.billing.initialize(identity);
  if (initialized.status === 'ready' && initialized.providerReference !== undefined && active())
    await ports.store.transact((tx) =>
      tx.writePurchaseIdentity({
        ...identity,
        providerReference: initialized.providerReference,
      }),
    );
}

export async function restoreCachedPurchases(
  ports: GamePorts,
  operation: { core: Committer; active: () => boolean },
): Promise<void> {
  await operation.core.commit(async (current) => {
    try {
      requireActive(operation.active);
      return await ports.store.transact(async (tx) => {
        requireActive(operation.active);
        const records = (await tx.readPurchases()).filter(
          (record) =>
            record.currentOwnership?.status !== 'removed' &&
            ports.purchasePolicy !== undefined &&
            authorizesPurchaseScope(ports.purchasePolicy, record.ownership.reference),
        );
        const rules = ports.content.economy.taxes;
        if (rules === undefined) return { outcome: { ok: false, error: 'TAX_RETURN_UNAVAILABLE' } };
        const state = records.reduce(
          (previous, record) =>
            exemptTaxes(previous, {
              transactionId: purchaseKey(record.ownership.reference),
              rules,
              dayMs: ports.content.economy.businessRules.dayMs,
            }),
          current,
        );
        const updated = state === current ? current : { ...state, revision: state.revision + 1 };
        requireActive(operation.active);
        if (updated !== current) await tx.writeState(updated);
        requireActive(operation.active);
        return {
          state: updated,
          outcome: { ok: true, revision: updated.revision, cashChangeCents: moneyCents(0) },
        };
      });
    } catch {
      return { outcome: { ok: false, error: 'SAVE_FAILED' } };
    }
  });
}

export function requireActive(active: () => boolean): void {
  if (!active()) throw new Error('Purchases disposed');
}
