import { formatMoneyExact } from '@/domain/money';
import { useGameSnapshot } from '@/features/game/GameContext';
import { DetailLine } from '@/ui/DetailLine';

export function TaxActivitySummary() {
  const { tax } = useGameSnapshot().state;
  if (tax.status === 'notStarted') return null;
  return (
    <>
      <DetailLine label="Tax paid" value={formatMoneyExact(tax.paidCents)} />
      <DetailLine label="Audit fines paid" value={formatMoneyExact(tax.finesPaidCents)} />
      <DetailLine label="Tax successfully evaded" value={formatMoneyExact(tax.evadedCents)} />
    </>
  );
}
