import { businessTaxSource, instrumentTaxBasis, propertyTaxBasis } from '@/domain/tax/sources';
import type { TaxState } from '@/domain/tax/types';

export function hasOwnedTaxBasis(document: {
  readonly tax: TaxState;
  readonly businesses: readonly { readonly definitionId: string }[];
  readonly properties: readonly { readonly definitionId: string }[];
  readonly positions: readonly { readonly instrumentId: string; readonly quantity: bigint }[];
}): boolean {
  const { tax } = document;
  if (tax.status !== 'active') return true;
  const keys = [
    ...document.businesses.map((b) => businessTaxSource(b.definitionId)),
    ...document.properties.map((p) => propertyTaxBasis(p.definitionId)),
    ...document.positions
      .filter((p) => p.quantity > 0n)
      .map((p) => instrumentTaxBasis(p.instrumentId)),
  ];
  return keys.every((key) => tax.basis[key] !== undefined);
}
