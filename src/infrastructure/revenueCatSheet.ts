import type { PurchaseResult } from '@/application/billingPort';
import type { RevenueCatConfig } from './revenueCatConfig';
import { checkoutFailure, type RevenueCatErrorName } from './revenueCatPurchase';
import type { RevenueCatSdk } from './revenueCatRuntime';
import type { StoreKitEvidence } from './storeKitEvidence';
import { confirmedStoreKitPurchase } from './storeKitOwnership';

export type CheckoutTrace = {
  readonly revenueCat: 'purchased' | 'otherProduct' | RevenueCatErrorName | 'unknown' | 'threw';
  readonly storeKit: PurchaseResult['status'] | 'notRead';
};

export type CheckoutLog = { last?: CheckoutTrace };

type Checkout = {
  readonly sdk: () => Promise<RevenueCatSdk>;
  readonly storeKit: () => Promise<StoreKitEvidence>;
  readonly config: RevenueCatConfig;
  readonly trace: CheckoutLog;
};

type OpenSheet = {
  open: { readonly productId: string; readonly checkout: Promise<PurchaseResult> } | undefined;
};

const openSheets = new WeakMap<object, OpenSheet>();

export type SheetCheckout = {
  readonly purchase: (productId: string) => Promise<PurchaseResult>;
  readonly pendingProductIds: () => readonly string[];
};

export function sheetCheckout(
  source: Checkout & { readonly settled: () => void; readonly process: object },
): SheetCheckout {
  const sheet = openSheets.get(source.process) ?? { open: undefined };
  openSheets.set(source.process, sheet);
  const watch = (open: Promise<PurchaseResult>) => {
    void open.then(source.settled);
    return open;
  };
  return {
    purchase: (productId) => {
      if (!source.config.productIds.includes(productId))
        return Promise.resolve({ status: 'disabled' });
      sheet.open ??= {
        productId,
        checkout: checkout(source, productId).finally(() => {
          sheet.open = undefined;
        }),
      };
      if (sheet.open.productId !== productId) return Promise.resolve({ status: 'unavailable' });
      return watch(sheet.open.checkout);
    },
    pendingProductIds: () => {
      if (sheet.open === undefined) return [];
      void watch(sheet.open.checkout);
      return [sheet.open.productId];
    },
  };
}

async function checkout(source: Checkout, productId: string): Promise<PurchaseResult> {
  const record = (revenueCat: CheckoutTrace['revenueCat'], result: PurchaseResult) => {
    source.trace.last = { revenueCat, storeKit: result.status };
    return result;
  };
  const confirm = async (revenueCat: CheckoutTrace['revenueCat']) =>
    record(
      revenueCat,
      await confirmedStoreKitPurchase(
        { storeKit: source.storeKit, config: source.config },
        productId,
      ),
    );
  try {
    const outcome = await (await source.sdk()).purchase(productId);
    if (outcome.status === 'purchased')
      return outcome.productId === productId
        ? await confirm('purchased')
        : withoutStoreKit(source, 'otherProduct', { status: 'verificationFailed' });
    const failure = checkoutFailure(outcome.error);
    if (failure === 'alreadyOwned') return await confirm(outcome.error);
    return withoutStoreKit(
      source,
      outcome.error,
      failure === 'pending' ? { status: 'pending', productId } : { status: failure },
    );
  } catch {
    return withoutStoreKit(source, 'threw', { status: 'unavailable' });
  }
}

function withoutStoreKit(
  source: Checkout,
  revenueCat: CheckoutTrace['revenueCat'],
  result: PurchaseResult,
): PurchaseResult {
  source.trace.last = { revenueCat, storeKit: 'notRead' };
  return result;
}
