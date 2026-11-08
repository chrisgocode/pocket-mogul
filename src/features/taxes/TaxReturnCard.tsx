import { TaxFilingButtons } from './TaxFilingButtons';
import { durationText } from '@/application/clockText';
import type { TaxesView } from '@/application/taxesView';
import { formatMoneyExact, moneyCents } from '@/domain/money';
import type { TaxReturn } from '@/domain/tax/types';
import type { GameCommand } from '@/domain/commands';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { DetailLine } from '@/ui/DetailLine';
import { useDisclosure } from '@/ui/state/useDisclosure';
import { AppText } from '@/ui/Typography';

import { TaxStatementLines } from './TaxStatementLines';

export function TaxReturnCard({
  statement,
  view,
  review,
}: {
  statement: TaxReturn;
  view: TaxesView;
  review: (command: GameCommand) => void;
}) {
  const { expanded, toggle } = useDisclosure();
  const fine =
    statement.filing.status === 'pendingAudit'
      ? statement.filing.fineCents
      : moneyCents(statement.amountCents * BigInt(view.fineMultiplier));
  return (
    <Card>
      <AppText variant="heading">{`Return ${statement.id} · ${filingLabel(statement.filing.status)}`}</AppText>
      <DetailLine label="Honest tax" value={formatMoneyExact(statement.amountCents)} emphasis />
      {statement.filing.status === 'pendingAudit' ? (
        <AppText
          muted
        >{`Audit check in ${durationText(Math.max(0, statement.filing.dueAtMs - view.simulationMs))} of credited time. Exposure: ${formatMoneyExact(moneyCents(statement.amountCents + fine))}.`}</AppText>
      ) : null}
      <TaxFilingButtons statement={statement} view={view} review={review} />
      <Button
        label={expanded ? `Hide return ${statement.id}` : `Inspect return ${statement.id}`}
        variant="secondary"
        onPress={toggle}
      />
      {expanded ? <TaxStatementLines lines={statement.lines} sourceName={view.sourceName} /> : null}
    </Card>
  );
}

function filingLabel(status: TaxReturn['filing']['status']): string {
  const labels = {
    unfiled: 'Ready to file',
    honest: 'Reported in full',
    pendingAudit: 'Audit pending',
    audited: 'Audit assessed',
    cleared: 'Cleared',
    waived: 'Exempt',
  };
  return labels[status];
}
