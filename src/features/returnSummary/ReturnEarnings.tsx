import type { ReturnSummaryView } from '@/application/returnSummaryView';
import { formatMoneyExact } from '@/domain/money';
import { DetailLine } from '@/ui/DetailLine';

export function ReturnEarnings({ summary }: { summary: ReturnSummaryView }) {
  return (
    <>
      {summary.earnings.map((line) => (
        <DetailLine key={line.label} label={line.label} value={formatMoneyExact(line.cents)} />
      ))}
      <DetailLine label="Total earned" value={formatMoneyExact(summary.totalCents)} emphasis />
      {summary.adBonusCents === undefined ? null : (
        <DetailLine
          label="Doubled by ad"
          value={`+${formatMoneyExact(summary.adBonusCents)}`}
          emphasis
        />
      )}
    </>
  );
}
