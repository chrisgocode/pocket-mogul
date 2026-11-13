import type { PayloadsView } from '@/application/spaceView';
import { formatMoneyExact } from '@/domain/money';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { AppText } from '@/ui/Typography';

import { daysLeftText } from './bakeryFormat';
import { PayloadOfferRow } from './PayloadOfferRow';
import type { SpaceActions } from './spaceFormat';

function progressNote(payloads: PayloadsView): string {
  const running = `${payloads.contracts.length} of ${payloads.maxContracts} running`;
  if (payloads.due === 0) return `Launched before open-market payloads · ${running}`;
  return `${payloads.launched} of ${payloads.due} contract payloads launched today · ${running}`;
}

function emptyNote(payloads: PayloadsView): string {
  if (payloads.contracts.length >= payloads.maxContracts) {
    return `Your pads hold ${payloads.maxContracts} payload contracts at a time`;
  }
  return 'No offer today. A new client asks every few days';
}

export function PayloadContractsCard({
  payloads,
  onAnswer,
}: {
  payloads: PayloadsView;
  onAnswer: SpaceActions['answerPayloadOffer'];
}) {
  return (
    <Card>
      <AppText variant="heading">Payload contracts</AppText>
      <AppText variant="caption" muted>
        {progressNote(payloads)}
      </AppText>
      {payloads.contracts.map((contract) => (
        <ListRow
          key={`${contract.client}-${contract.daysLeft}`}
          title={contract.client}
          subtitle={`${contract.payloadsPerDay} payloads a day · ${daysLeftText(contract.daysLeft)}`}
          value={`${formatMoneyExact(contract.rateCents)} a payload`}
        />
      ))}
      {payloads.offer === undefined ? (
        <AppText muted>{emptyNote(payloads)}</AppText>
      ) : (
        <PayloadOfferRow offer={payloads.offer} onAnswer={onAnswer} />
      )}
    </Card>
  );
}
