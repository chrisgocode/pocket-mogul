import { durationText } from '@/application/clockText';
import type { TaxLine } from '@/domain/tax/types';
import { formatMoneyExact } from '@/domain/money';
import { AppText } from '@/ui/Typography';

const BPS_PER_PERCENT = 100;

export function TaxStatementLines({
  lines,
  sourceName,
}: {
  lines: readonly TaxLine[];
  sourceName: (id: string) => string;
}) {
  return lines.map((line) => (
    <AppText key={`${line.atMs}:${line.source}`} variant="caption">
      {`${sourceName(line.source)} · game time ${durationText(line.atMs)} · gross ${formatMoneyExact(line.grossCents)}, costs/basis ${formatMoneyExact(line.costsCents)}, profit ${formatMoneyExact(line.profitCents)}, losses used ${formatMoneyExact(line.lossOffsetCents)}, taxable ${formatMoneyExact(line.baseCents)} at ${line.rateBps / BPS_PER_PERCENT}%: tax ${formatMoneyExact(line.taxCents)}`}
    </AppText>
  ));
}
