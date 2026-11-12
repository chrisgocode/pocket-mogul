import { revenueCatBilling } from '@/infrastructure/revenueCatBilling';
import { revenueCatRuntime, type RevenueCatPurchase } from '@/infrastructure/revenueCatRuntime';
import {
  revenueCatFake,
  storeKitFake,
  storeKitPurchase,
  validationConfig,
} from '@/infrastructure/revenueCatTesting';
import type { Game } from './game';
import { fakeClock, startObservedTestGame, type FakeClock } from './testGame';

export const START_MS = 1_800_000_000_000;
export const INTERACTIVE_LIMIT_MS = 300_000;
export const PRODUCT = validationConfig.productId;
export const checkoutConfig = { ...validationConfig, checkout: 'sandbox' } as const;

type Setup = {
  readonly purchase?: (productId: string) => Promise<RevenueCatPurchase>;
  readonly storeKit?: ReturnType<typeof storeKitFake>;
  readonly clock?: FakeClock;
  readonly config?: unknown;
};

export function checkoutSelection(setup: Setup = {}) {
  const sdk = revenueCatFake(setup.purchase === undefined ? {} : { purchase: setup.purchase });
  const storeKit = setup.storeKit ?? storeKitFake({ latest: storeKitPurchase });
  const clock = setup.clock ?? fakeClock(START_MS);
  const selected = revenueCatBilling({
    config: setup.config ?? checkoutConfig,
    platform: 'ios',
    runtime: revenueCatRuntime(() => Promise.resolve(sdk)),
    storeKit: { evidence: () => Promise.resolve(storeKit), clock },
  });
  return { selected: { ...selected, clock }, sdk, storeKit };
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
