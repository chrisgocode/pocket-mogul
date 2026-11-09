import type { Game } from '@/application/game';

export function installBillingValidationDriver(game: Game): void {
  Object.assign(globalThis, {
    pocketMogulBillingValidation: async () => {
      const products = await game.purchases.products();
      const ownership = await game.purchases.restore();
      return {
        products,
        ownership: ownership.status,
        operation: game.purchases.getState().status,
        checkout: 'disabled',
      };
    },
  });
}
