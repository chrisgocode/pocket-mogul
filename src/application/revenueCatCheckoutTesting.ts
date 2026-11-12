import { revenueCatBilling } from '@/infrastructure/revenueCatBilling';
import { revenueCatRuntime, type RevenueCatPurchase } from '@/infrastructure/revenueCatRuntime';
import {
  revenueCatFake,
  type RevenueCatScript,
  storeKitFake,
  storeKitPurchase,
  validationConfig,
} from '@/infrastructure/revenueCatTesting';
import type { Game } from './game';
import { fakeClock, startObservedTestGame, type FakeClock } from './testGame';

export const START_MS = 1_800_000_000_000;
export const INTERACTIVE_LIMIT_MS = 300_000;
const RELAUNCH_AFTER_MS = 60_000;
export const PRODUCT = validationConfig.productId;
export const checkoutConfig = { ...validationConfig, checkout: 'sandbox' } as const;

type Setup = RevenueCatScript & {
  readonly storeKit?: ReturnType<typeof storeKitFake>;
  readonly clock?: FakeClock;
  readonly config?: unknown;
};

type Process = {
  readonly sdk: ReturnType<typeof revenueCatFake>;
  readonly runtime: ReturnType<typeof revenueCatRuntime>;
};

export function checkoutProcess(script: RevenueCatScript = {}): Process {
  const sdk = revenueCatFake(script);
  return { sdk, runtime: revenueCatRuntime(() => Promise.resolve(sdk)) };
}

export function checkoutSelection(setup: Setup & { readonly process?: Process } = {}) {
  const { process, config, storeKit: account, clock: started, ...script } = setup;
  const { sdk, runtime } = process ?? checkoutProcess(script);
  const storeKit = account ?? storeKitFake({ latest: storeKitPurchase });
  const clock = started ?? fakeClock(START_MS);
  const selected = revenueCatBilling({
    config: config ?? checkoutConfig,
    platform: 'ios',
    runtime,
    storeKit: { evidence: () => Promise.resolve(storeKit), clock },
  });
  return { selected: { ...selected, clock }, sdk, storeKit };
}

export function relaunchSelection(storeKit: ReturnType<typeof storeKitFake>) {
  return checkoutSelection({ storeKit, clock: fakeClock(START_MS + RELAUNCH_AFTER_MS) });
}

export async function checkoutGame(setup: Setup = {}) {
  const { selected, sdk, storeKit } = checkoutSelection(setup);
  return { session: await startObservedTestGame(selected), sdk, storeKit };
}

export function failed(name: Extract<RevenueCatPurchase, { status: 'failed' }>['error']) {
  return (): Promise<RevenueCatPurchase> => Promise.resolve({ status: 'failed', error: name });
}

export function untilExempt(game: Game): Promise<void> {
  return new Promise((resolve) => {
    const unsubscribe = game.subscribe(() => {
      if (game.getSnapshot().state.tax.status !== 'exempt') return;
      unsubscribe();
      resolve();
    });
  });
}
