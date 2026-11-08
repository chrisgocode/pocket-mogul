import { formatMoneyExact } from '@/domain/money';
import type { TaxAbsence } from '@/domain/tax/types';
import { DetailLine } from '@/ui/DetailLine';

export function ReturnTaxLines({ taxes }: { taxes: TaxAbsence | undefined }) {
  if (taxes === undefined) return null;
  return (
    <>
      <DetailLine label="Your gross earnings" value={formatMoneyExact(taxes.grossCents)} />
      <DetailLine label="Operating costs" value={formatMoneyExact(taxes.costsCents)} />
      <DetailLine label="New estimated tax" value={formatMoneyExact(taxes.estimatedCents)} />
      <DetailLine label="Tax and fines collected" value={formatMoneyExact(taxes.collectedCents)} />
      <DetailLine label="Personal cash received" value={formatMoneyExact(taxes.cashCents)} />
      <DetailLine label="Treasury growth" value={formatMoneyExact(taxes.treasuryCents)} />
    </>
  );
}
