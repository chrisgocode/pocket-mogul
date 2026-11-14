import type { GameState } from '@/domain/gameState';

import type { ProductMetadata } from './billingPort';
import { bundleTerms } from './storeBundleView';
import {
  ownsProduct,
  STORE_UNREACHABLE,
  type Storefront,
  type StorefrontState,
} from './storefront';

export type StoreRow = {
  readonly productId: string;
  readonly name: string;
  readonly pitch: string;
  readonly finePrint: string | undefined;
  readonly saving: string | undefined;
  readonly offer:
    | { readonly status: 'owned' }
    | { readonly status: 'forSale' | 'buying'; readonly price: string };
};

type Copy = { readonly name: string; readonly pitch: string; readonly finePrint?: string };

const COPY: Readonly<Record<string, Copy>> = {
  pm_mogul_bundle: {
    name: 'Mogul bundle',
    pitch:
      'Four in one: Tax exemption, VIP pass (with Remove ads), Golden wallet and Night manager.',
    finePrint: "Founder's badge and Collector's pass are not included.",
  },
  pm_tax_exemption: {
    name: 'Tax exemption',
    pitch:
      'Never file or pay tax again. Unpaid tax and fines are waived, on this save and every new one.',
    finePrint: 'No cash is refunded for tax already paid. Ads stay.',
  },
  pm_remove_ads: {
    name: 'Remove ads',
    pitch: 'No more ads between screens or when you come back to the game.',
    finePrint: 'Ads you choose to watch for a reward stay.',
  },
  pm_vip_pass: {
    name: 'VIP pass',
    pitch: 'No ads at all. Tap Boost and every ad reward are yours at the press of a button.',
    finePrint: 'Includes Remove ads. Daily limits on each reward still apply.',
  },
  pm_golden_wallet: {
    name: 'Golden wallet',
    pitch: 'Every tap pays double, for good, and your wallet turns gold.',
    finePrint: 'Stacks with Tap Boost and collection set bonuses.',
  },
  pm_night_manager: {
    name: 'Night manager',
    pitch: 'Your empire earns for up to 24 hours while you are away, instead of 8.',
    finePrint: 'Applies from your next return. Taxes and incidents keep running too.',
  },
  pm_founder: {
    name: "Founder's badge",
    pitch: 'A Founder title on your Profile and your name in gold on the Rich List.',
    finePrint: 'Cosmetic only: it changes no money.',
  },
  pm_collectors_pass: {
    name: "Collector's pass",
    pitch:
      'A fourth lot at every auction, and The Vault: a set of five pieces only pass holders are offered.',
    finePrint: 'The Vault adds +5% tap income, inside the +30% cap on set perks.',
  },
};

type Shelf = Pick<Storefront, 'catalogue'> & { readonly front: StorefrontState };

const nameOf = (listed: readonly ProductMetadata[]) => (productId: string) =>
  listed.find((product) => product.productId === productId)?.displayName ??
  COPY[productId]?.name ??
  productId;

function offered(metadata: ProductMetadata, front: StorefrontState): StoreRow['offer'] {
  const { activity } = front;
  const buying = activity.status === 'buying' && activity.productId === metadata.productId;
  return { status: buying ? 'buying' : 'forSale', price: metadata.displayPrice };
}

function forSale(state: GameState, sale: { metadata: ProductMetadata; shelf: Shelf }): StoreRow {
  const { metadata, shelf } = sale;
  const { productId } = metadata;
  const listed = shelf.front.shelf.status === 'listed' ? shelf.front.shelf.products : [];
  const copy = COPY[productId];
  const terms = bundleTerms(state, {
    productId,
    shelf: { catalogue: shelf.catalogue, listed, nameOf: nameOf(listed) },
  });
  return {
    productId,
    name: metadata.displayName,
    pitch: copy?.pitch ?? '',
    finePrint: terms.ownedParts ?? copy?.finePrint,
    saving: terms.saving,
    offer: offered(metadata, shelf.front),
  };
}

function owned(productId: string, listed: readonly ProductMetadata[]): StoreRow {
  const copy = COPY[productId];
  return {
    productId,
    name: nameOf(listed)(productId),
    pitch: copy?.pitch ?? '',
    finePrint: copy?.finePrint,
    saving: undefined,
    offer: { status: 'owned' },
  };
}

export function selectStore(state: GameState, shelf: Shelf): readonly StoreRow[] {
  const { front, catalogue } = shelf;
  const listed = front.shelf.status === 'listed' ? front.shelf.products : [];
  return catalogue.flatMap((product): StoreRow[] => {
    if (ownsProduct(state, product)) return [owned(product.productId, listed)];
    const metadata = listed.find((candidate) => candidate.productId === product.productId);
    return metadata === undefined ? [] : [forSale(state, { metadata, shelf })];
  });
}

export function storeNotice(
  front: StorefrontState,
  about: 'checkout' | 'restore',
): string | undefined {
  return front.notice.about === about ? front.notice.text : undefined;
}

export function emptyStoreText(front: StorefrontState): { title: string; message: string } {
  return front.shelf.status === 'loading'
    ? { title: 'Opening the Store', message: 'Fetching prices from the store.' }
    : { title: 'Store unavailable', message: STORE_UNREACHABLE };
}
