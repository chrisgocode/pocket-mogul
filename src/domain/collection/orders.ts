import type { MoneyCents } from '@/domain/money';

type BuyCollectible = {
  readonly type: 'BuyCollectible';
  readonly pieceId: string;
  readonly priceCents: MoneyCents;
};

type SellCollectible = {
  readonly type: 'SellCollectible';
  readonly pieceId: string;
  readonly quotedRevision?: number;
};

type SetShowpiece = { readonly type: 'SetShowpiece'; readonly pieceId: string | null };

export type CollectionCommand = BuyCollectible | SellCollectible | SetShowpiece;
