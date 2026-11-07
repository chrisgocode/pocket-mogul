import type { AssetQuote } from '@/application/marketsView';

export type AssetKind = AssetQuote['kind'];

export type TradeUnits = { readonly plural: string; readonly title: string };

const UNITS: Record<AssetKind, TradeUnits> = {
  stock: { plural: 'shares', title: 'Shares' },
  coin: { plural: 'coins', title: 'Coins' },
};

export function tradeUnits(kind: AssetKind): TradeUnits {
  return UNITS[kind];
}
