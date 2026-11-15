import type { GameState } from '@/domain/gameState';

import type { ProductMetadata } from './billingPort';
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
  readonly offer:
    | { readonly status: 'owned' }
    | { readonly status: 'forSale' | 'buying'; readonly price: string };
};

type Copy = { readonly name: string; readonly pitch: string; readonly finePrint?: string };

const COPY: Readonly<Record<string, Copy>> = {
  pm_tax_exemption: {
    name: 'Tax exemption',
    pitch:
      'Never file or pay tax again. Unpaid tax and fines are waived, on this save and every new one.',
    finePrint: 'No cash is refunded for tax already paid. Ads stay.',
  },
};

type Shelf = Pick<Storefront, 'catalogue'> & { readonly front: StorefrontState };

function described(productId: string, metadata: ProductMetadata | undefined) {
  const copy = COPY[productId];
  return {
    productId,
    name: metadata?.displayName ?? copy?.name ?? productId,
    pitch: copy?.pitch ?? '',
    finePrint: copy?.finePrint,
  };
}

function offered(metadata: ProductMetadata, front: StorefrontState): StoreRow['offer'] {
  const { activity } = front;
  const buying = activity.status === 'buying' && activity.productId === metadata.productId;
  return { status: buying ? 'buying' : 'forSale', price: metadata.displayPrice };
}

export function selectStore(state: GameState, shelf: Shelf): readonly StoreRow[] {
  const { front, catalogue } = shelf;
  const listed = front.shelf.status === 'listed' ? front.shelf.products : [];
  return catalogue.flatMap((product): StoreRow[] => {
    const metadata = listed.find((candidate) => candidate.productId === product.productId);
    const row = described(product.productId, metadata);
    if (ownsProduct(state, product)) return [{ ...row, offer: { status: 'owned' } }];
    return metadata === undefined ? [] : [{ ...row, offer: offered(metadata, front) }];
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
