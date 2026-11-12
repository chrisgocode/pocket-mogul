import { Alert } from 'react-native';
import type { AlertButton } from 'react-native';
import { registerDevMenuItems } from 'expo-dev-client';
import type { Game } from '@/application/game';
import type { BillingValidationProbe } from '@/infrastructure/revenueCatEvidenceProbe';
import type { BillingValidation } from '@/infrastructure/revenueCatBilling';

type Driver = {
  readonly game: Game;
  readonly probe?: BillingValidationProbe | undefined;
  readonly validation?: BillingValidation | undefined;
};

type Action = 'purchase' | 'refund' | 'restore' | 'recover';

type LastAction = { readonly action: Action; readonly outcome: string };

type Report = Awaited<ReturnType<typeof readValidation>>;

type Session = {
  readonly read: () => Promise<Report>;
  readonly run: (action: Action) => Promise<Report>;
  readonly actions: readonly Action[];
  readonly probe?: BillingValidationProbe | undefined;
};

const ACTION_LABELS: Record<Action, string> = {
  purchase: 'Purchase test product',
  refund: 'Request refund',
  restore: 'Restore purchases',
  recover: 'Recover',
};

export function installBillingValidationDriver(driver: Driver): void {
  const session = validationSession(driver);
  const global = Object.assign(session.read, {
    purchase: () => session.run('purchase'),
    restore: () => session.run('restore'),
    recover: () => session.run('recover'),
    refund: () => session.run('refund'),
  });
  Object.assign(globalThis, { pocketFortuneBillingValidation: global });
  if (__DEV__) void registerValidationMenu(session).catch(() => undefined);
  else showReport(session, session.read);
}

function validationSession(driver: Driver): Session {
  const last: { current?: LastAction } = {};
  const read = () => readValidation(driver, last.current);
  const checkout = driver.validation?.checkout === 'sandbox';
  return {
    read,
    probe: driver.probe,
    actions: checkout ? ['purchase', 'refund', 'restore', 'recover'] : ['restore', 'recover'],
    run: async (action) => {
      if ((action === 'purchase' || action === 'refund') && !checkout) return read();
      last.current = { action, outcome: await runAction(driver, action) };
      return read();
    },
  };
}

async function runAction(driver: Driver, action: Action): Promise<string> {
  const purchases = driver.game.purchases;
  if (action === 'purchase')
    return (await purchases.purchase(driver.validation?.productId ?? '')).status;
  if (action === 'refund') return (await driver.validation?.requestRefund()) ?? 'disabled';
  if (action === 'restore') return (await purchases.restore()).status;
  await purchases.recover();
  return purchases.getState().status;
}

function showReport(session: Session, report: () => Promise<Report>): void {
  const again = (next: () => Promise<Report>) => () => showReport(session, next);
  const buttons: AlertButton[] = [
    { text: 'Read again', onPress: again(session.read) },
    ...refreshButton(session, again),
    ...session.actions.map((action) => ({
      text: ACTION_LABELS[action],
      onPress: again(() => session.run(action)),
    })),
    { text: 'Continue', style: 'cancel' },
  ];
  void report()
    .then((value) => Alert.alert('Billing validation', JSON.stringify(value), buttons))
    .catch(() => Alert.alert('Billing validation', 'Unavailable', buttons));
}

function refreshButton(
  session: Session,
  again: (next: () => Promise<Report>) => () => void,
): AlertButton[] {
  const { probe } = session;
  if (probe === undefined) return [];
  return [
    {
      text: 'Refresh ownership',
      onPress: again(() => probe.invalidate().then(() => session.run('recover'))),
    },
  ];
}

async function readValidation(driver: Driver, last: LastAction | undefined) {
  const { game, validation, probe } = driver;
  const products = await game.purchases.products();
  const { tax } = game.getSnapshot().state;
  return {
    products,
    operation: game.purchases.getState().status,
    checkout: validation?.checkout ?? 'disabled',
    tax: {
      status: tax.status,
      entitlements: tax.status === 'exempt' ? tax.entitlementIds.length : 0,
    },
    ...(last === undefined ? {} : { last }),
    ...(validation === undefined ? {} : await validationEvidence(validation)),
    ...(probe === undefined ? {} : { evidence: probe.read() }),
  };
}

async function validationEvidence(validation: BillingValidation) {
  const trace = validation.lastCheckout();
  return {
    ...(trace === undefined ? {} : { checkoutTrace: trace }),
    storeKit: await validation.storeKit(),
  };
}

async function registerValidationMenu(session: Session) {
  await registerDevMenuItems([
    {
      name: 'Billing validation',
      shouldCollapse: true,
      callback: () => showReport(session, session.read),
    },
  ]);
}
