import { Alert } from 'react-native';
import type { AlertButton } from 'react-native';
import { registerDevMenuItems } from 'expo-dev-client';
import type { Game } from '@/application/game';
import type { BillingValidationProbe } from '@/infrastructure/revenueCatEvidenceProbe';

export function installBillingValidationDriver(game: Game, probe?: BillingValidationProbe): void {
  const read = () => readValidation(game, probe);
  Object.assign(globalThis, { pocketFortuneBillingValidation: read });
  if (__DEV__) void registerValidationMenu(read).catch(() => undefined);
  else showStandaloneReport(read, probe);
}

function showStandaloneReport(
  read: () => ReturnType<typeof readValidation>,
  probe?: BillingValidationProbe,
): void {
  const buttons: AlertButton[] = [
    { text: 'Read again', onPress: () => showStandaloneReport(read, probe) },
    ...(probe === undefined
      ? []
      : [
          {
            text: 'Refresh ownership',
            onPress: () => {
              void probe.invalidate().then(() => showStandaloneReport(read, probe));
            },
          },
        ]),
    { text: 'Continue', style: 'cancel' },
  ];
  void read()
    .then((report) => Alert.alert('Billing validation', JSON.stringify(report), buttons))
    .catch(() => Alert.alert('Billing validation', 'Unavailable', buttons));
}

async function readValidation(game: Game, probe?: BillingValidationProbe) {
  const products = await game.purchases.products();
  const ownership = await game.purchases.restore();
  return {
    products,
    ownership: ownership.status,
    operation: game.purchases.getState().status,
    checkout: 'disabled',
    ...(probe === undefined ? {} : { evidence: probe.read() }),
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
