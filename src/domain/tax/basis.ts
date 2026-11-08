import type { TaxLedger } from './types';

export function requireTaxBasis(tax: TaxLedger, source: string): bigint {
  const amount = tax.basis[source];
  if (amount === undefined) throw new Error(`Missing tax basis for ${source}`);
  return amount;
}
