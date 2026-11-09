import type { Committer, GamePorts } from './game';
import { requireActive } from './purchaseRecovery';

export type CheckoutGuard = {
  readonly status: 'pending' | 'interrupted' | 'delivered';
  readonly productId: string;
};

type Context = { ports: GamePorts; core: Committer; active: () => boolean };

export function readCheckoutGuard(context: Context): Promise<CheckoutGuard | undefined> {
  return context.core.queue.run(() =>
    context.ports.store.transact(async (tx) => (await tx.readPurchaseIdentity())?.checkout),
  );
}

export function saveCheckoutGuard(
  context: Context,
  checkout: CheckoutGuard | undefined,
): Promise<void> {
  return context.core.queue.run(() =>
    context.ports.store.transact(async (tx) => {
      requireActive(context.active);
      const identity = await tx.readPurchaseIdentity();
      requireActive(context.active);
      await tx.writePurchaseIdentity({ id: context.ports.createId(), ...identity, checkout });
      requireActive(context.active);
    }),
  );
}
