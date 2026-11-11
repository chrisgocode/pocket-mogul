import type { RevenueCatInfo, RevenueCatSdk } from './revenueCatRuntime';
import type { Clock } from '@/application/ports';

const INVALIDATION_WAIT_MS = 2_000;

type Verification = 'verified' | 'verifiedOnDevice' | 'failed' | 'notVerified';

type ReadEvidence =
  | { readonly status: 'notRead' | 'unavailable' }
  | {
      readonly status: 'returned';
      readonly observedAtMs: number;
      readonly verification: Verification;
    };

type ProbeState =
  | { readonly status: 'idle' }
  | {
      readonly status: 'attached';
      readonly cache: 'untouched' | 'invalidated' | 'unavailable';
      readonly customerInfo: ReadEvidence;
      readonly invalidate: () => Promise<void>;
    };

export type BillingValidationProbe = Pick<
  ReturnType<typeof revenueCatEvidenceProbe>,
  'read' | 'invalidate'
>;

export function revenueCatEvidenceProbe(clock: Pick<Clock, 'schedule'>) {
  let state: ProbeState = { status: 'idle' };
  const record = (customerInfo: ReadEvidence) => {
    if (state.status === 'attached') state = { ...state, customerInfo };
  };
  return {
    attach: (input: { sdk: RevenueCatSdk; invalidate: () => Promise<void> }): RevenueCatSdk => {
      return {
        ...input.sdk,
        configure: (apiKey) => {
          input.sdk.configure(apiKey);
          state = attachedState(input.invalidate);
        },
        getCustomerInfo: () => observedCustomerInfo(input.sdk, record),
      };
    },
    read: () =>
      state.status === 'attached'
        ? { cache: state.cache, customerInfo: state.customerInfo }
        : undefined,
    invalidate: async () => {
      if (state.status !== 'attached') return;
      const cache = await boundedInvalidation(clock, state.invalidate);
      if (state.status === 'attached') state = { ...state, cache };
    },
  };
}

function boundedInvalidation(
  clock: Pick<Clock, 'schedule'>,
  invalidate: () => Promise<void>,
): Promise<'invalidated' | 'unavailable'> {
  return new Promise((resolve) => {
    const cancel = clock.schedule(INVALIDATION_WAIT_MS, () => resolve('unavailable'));
    void Promise.resolve()
      .then(invalidate)
      .then(
        () => {
          cancel();
          return resolve('invalidated');
        },
        () => {
          cancel();
          return resolve('unavailable');
        },
      );
  });
}

function attachedState(invalidate: () => Promise<void>): ProbeState {
  return {
    status: 'attached',
    cache: 'untouched',
    customerInfo: { status: 'notRead' },
    invalidate,
  };
}

async function observedCustomerInfo(sdk: RevenueCatSdk, record: (evidence: ReadEvidence) => void) {
  try {
    const info = await sdk.getCustomerInfo();
    record(readEvidence(info));
    return info;
  } catch (error) {
    record({ status: 'unavailable' });
    throw error;
  }
}

function readEvidence(info: RevenueCatInfo): ReadEvidence {
  const observedAtMs = Date.parse(info.requestDate);
  if (!Number.isFinite(observedAtMs)) return { status: 'unavailable' };
  return {
    status: 'returned',
    observedAtMs,
    verification: readVerification(info.entitlements.verification),
  };
}

function readVerification(verification: string): Verification {
  if (verification === 'VERIFIED') return 'verified';
  if (verification === 'VERIFIED_ON_DEVICE') return 'verifiedOnDevice';
  if (verification === 'FAILED') return 'failed';
  return 'notVerified';
}
