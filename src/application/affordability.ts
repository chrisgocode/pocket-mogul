import { moneyCents, type MoneyCents } from '@/domain/money';

export type Affordability = { readonly affordable: boolean; readonly shortfallCents: MoneyCents };

export function affordability(priceCents: MoneyCents, cashCents: MoneyCents): Affordability {
  const shortfall = priceCents - cashCents;
  return {
    affordable: shortfall <= 0n,
    shortfallCents: moneyCents(shortfall > 0n ? shortfall : 0n),
  };
}
