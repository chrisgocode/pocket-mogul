import type { AvailableCardReaders, CardReaderOption } from '@/application/vendingView';
import { priceLabel } from '@/features/game/priceFormat';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';

import { stageName } from './businessFormat';

const EFFECT = '+20% customers at every price';

export function CardReaderCard({
  readers,
  onReview,
}: {
  readers: CardReaderOption;
  onReview: (readers: AvailableCardReaders) => void;
}) {
  if (readers.status === 'locked') {
    const value = `Unlocks at ${stageName(readers.unlockStage)}`;
    return (
      <Card>
        <ListRow title="Card readers" subtitle={EFFECT} value={value} dimmed />
      </Card>
    );
  }
  if (readers.status === 'installed') {
    return (
      <Card>
        <ListRow title="Card readers" subtitle={EFFECT} value="Installed" />
      </Card>
    );
  }
  const label = priceLabel('Install card readers', readers);
  return (
    <Card>
      <ListRow title="Card readers" subtitle={EFFECT} />
      <Button label={label} onPress={() => onReview(readers)} disabled={!readers.affordable} />
    </Card>
  );
}
