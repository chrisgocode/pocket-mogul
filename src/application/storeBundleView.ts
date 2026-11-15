import type { GameState } from '@/domain/gameState';

import type { ProductMetadata } from './billingPort';
import type { CatalogueProduct } from './purchaseLedger';
import { ownsProduct } from './storefront';

export const BUNDLE_PARTS: Readonly<Record<string, readonly string[]>> = {
  pm_mogul_bundle: ['pm_tax_exemption', 'pm_vip_pass', 'pm_golden_wallet', 'pm_night_manager'],
};

export type BundleTerms = {
  readonly saving: string | undefined;
  readonly ownedParts: string | undefined;
};

type Shelf = {
  readonly catalogue: readonly CatalogueProduct[];
  readonly listed: readonly ProductMetadata[];
  readonly nameOf: (productId: string) => string;
};

const NO_TERMS: BundleTerms = { saving: undefined, ownedParts: undefined };
const WHOLE_PERCENT = 100;

function listOf(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function priceOf(listed: readonly ProductMetadata[], productId: string): number | undefined {
  return listed.find((product) => product.productId === productId)?.price;
}

function savingPercent(bundle: number | undefined, parts: readonly (number | undefined)[]) {
  const known = parts.flatMap((price) => (price === undefined ? [] : [price]));
  if (bundle === undefined || known.length < parts.length) return undefined;
  const separately = known.reduce((total, price) => total + price, 0);
  if (separately <= 0) return undefined;
  return Math.round(((separately - bundle) / separately) * WHOLE_PERCENT);
}

function savingText(percent: number | undefined, owned: number): string | undefined {
  if (percent === undefined) return undefined;
  if (percent > 0) {
    return owned === 0
      ? `Save ${percent}% against buying each part on its own.`
      : `Save ${percent}% against buying the parts you don't own yet.`;
  }
  return owned === 0 ? undefined : "The parts you don't own yet cost less bought on their own.";
}

export function bundleTerms(
  state: GameState,
  bundle: { readonly productId: string; readonly shelf: Shelf },
): BundleTerms {
  const { catalogue, listed, nameOf } = bundle.shelf;
  const parts = (BUNDLE_PARTS[bundle.productId] ?? []).flatMap((productId) =>
    catalogue.filter((product) => product.productId === productId),
  );
  if (parts.length === 0) return NO_TERMS;
  const owned = parts.filter((part) => ownsProduct(state, part));
  const missing = parts.filter((part) => !ownsProduct(state, part));
  const percent = savingPercent(
    priceOf(listed, bundle.productId),
    missing.map((part) => priceOf(listed, part.productId)),
  );
  return {
    saving: savingText(percent, owned.length),
    ownedParts:
      owned.length === 0
        ? undefined
        : `You already own ${listOf(owned.map((part) => nameOf(part.productId)))}. The bundle costs the same: the store gives no discount for parts you own.`,
  };
}
