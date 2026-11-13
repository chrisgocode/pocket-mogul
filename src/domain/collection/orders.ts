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

export type CollectionCommand = BuyCollectible | SellCollectible;
