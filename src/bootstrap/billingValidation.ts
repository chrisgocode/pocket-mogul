import { Alert } from 'react-native';
import { registerDevMenuItems } from 'expo-dev-client';
import type { Game } from '@/application/game';

export function installBillingValidationDriver(game: Game): void {
  const read = () => readValidation(game);
  Object.assign(globalThis, { pocketFortuneBillingValidation: read });
  if (__DEV__) void registerValidationMenu(read).catch(() => undefined);
}

async function readValidation(game: Game) {
  const products = await game.purchases.products();
  const ownership = await game.purchases.restore();
  return {
    products,
    ownership: ownership.status,
    operation: game.purchases.getState().status,
    checkout: 'disabled',
  };
}

async function registerValidationMenu(read: () => ReturnType<typeof readValidation>) {
  await registerDevMenuItems([
    {
      name: 'Read billing validation',
      shouldCollapse: true,
      callback: () => {
        void read()
          .then((report) => Alert.alert('Billing validation', JSON.stringify(report)))
          .catch(() => Alert.alert('Billing validation', 'Unavailable'));
      },
    },
  ]);
}
