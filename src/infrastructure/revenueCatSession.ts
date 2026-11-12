import type { BillingEvent, BillingPort } from '@/application/billingPort';
import type { Clock } from '@/application/ports';
import type { RevenueCatConfig } from './revenueCatConfig';
import type { RevenueCatSdk } from './revenueCatRuntime';
import type { StoreKitEvidence } from './storeKitEvidence';

export type ProviderTrace = {
  readonly identity: 'unknown' | 'created' | 'retained' | 'replaced';
  readonly transfer: 'notRequested' | 'requested' | 'completed' | 'failed';
};

export type ProviderLog = { -readonly [Field in keyof ProviderTrace]: ProviderTrace[Field] };

type SessionOptions = {
  readonly runtime: (config: RevenueCatConfig) => Promise<RevenueCatSdk>;
  readonly storeKit?:
    | {
        readonly evidence: () => Promise<StoreKitEvidence>;
        readonly clock: Pick<Clock, 'wallMs'>;
      }
    | undefined;
  readonly provider: ProviderLog;
};

type Started = {
  readonly native: RevenueCatSdk;
  readonly providerReference: string;
  readonly stopUpdates: () => void;
};

type Session =
  | { readonly status: 'idle' | 'disposed' }
  | { readonly status: 'starting'; readonly ready: Promise<Started> };

type BillingSession = Pick<BillingPort, 'initialize' | 'subscribe' | 'dispose'> & {
  readonly sdk: () => Promise<RevenueCatSdk>;
  readonly requestReconciliation: () => void;
};

export function billingSession(config: RevenueCatConfig, options: SessionOptions): BillingSession {
  let session: Session = { status: 'idle' };
  const listeners = ownershipListeners();
  const changed = listeners.notify;
  const started = () =>
    session.status === 'starting' ? session.ready : Promise.reject(new Error('Billing not ready'));
  const start = async (saved?: string): Promise<Started> => {
    const native = await options.runtime(config);
    const providerReference = await native.getAppUserID();
    options.provider.identity = identityChange(saved, providerReference);
    if (session.status === 'disposed')
      return { native, providerReference, stopUpdates: () => undefined };
    native.addCustomerInfoUpdateListener(changed);
    return { native, providerReference, stopUpdates: await storeKitUpdates(options, changed) };
  };
  return {
    sdk: () => started().then(({ native }) => native),
    requestReconciliation: changed,
    initialize: async (identity) => {
      if (session.status === 'disposed') return { status: 'unavailable' };
      session =
        session.status === 'idle'
          ? { status: 'starting', ready: start(identity?.providerReference) }
          : session;
      return started().then(
        ({ providerReference }) => ({ status: 'ready', providerReference }) as const,
        () => ({ status: 'unavailable' }) as const,
      );
    },
    subscribe: listeners.subscribe,
    dispose: () => {
      void started()
        .then((running) => stopListening(running, changed))
        .catch(() => undefined);
      session = { status: 'disposed' };
      listeners.clear();
    },
  };
}

function identityChange(saved: string | undefined, current: string): ProviderTrace['identity'] {
  if (saved === undefined) return 'created';
  return saved === current ? 'retained' : 'replaced';
}

function ownershipListeners() {
  const listeners = new Set<(event: BillingEvent) => void>();
  return {
    notify: () => {
      for (const listener of listeners) listener({ type: 'ownershipChanged' });
    },
    subscribe: (listener: (event: BillingEvent) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    clear: () => listeners.clear(),
  };
}

function stopListening(running: Started, changed: () => void): void {
  running.native.removeCustomerInfoUpdateListener(changed);
  running.stopUpdates();
}

async function storeKitUpdates(options: SessionOptions, changed: () => void): Promise<() => void> {
  if (options.storeKit === undefined) return () => undefined;
  try {
    return (await options.storeKit.evidence()).addUpdatesListener(changed);
  } catch {
    return () => undefined;
  }
}
