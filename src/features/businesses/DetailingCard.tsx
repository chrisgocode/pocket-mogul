import type { AvailableDetailing, DetailingOption } from '@/application/carWashView';
import { priceLabel } from '@/features/game/priceFormat';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';

import { stageName } from './businessFormat';

const EFFECT = 'A fourth package at the top price that holds a bay the longest';

export function DetailingCard({
  detailing,
  onReview,
}: {
  detailing: DetailingOption;
  onReview: (detailing: AvailableDetailing) => void;
}) {
  if (detailing.status === 'locked') {
    const value = `Unlocks at ${stageName(detailing.unlockStage)}`;
    return (
      <Card>
        <ListRow title="Detailing" subtitle={EFFECT} value={value} dimmed />
      </Card>
    );
  }
  if (detailing.status === 'installed') {
    return (
      <Card>
        <ListRow title="Detailing" subtitle={EFFECT} value="Added" />
      </Card>
    );
  }
  return (
    <Card>
      <ListRow title="Detailing" subtitle={EFFECT} />
      <Button
        label={priceLabel('Add detailing', detailing)}
        onPress={() => onReview(detailing)}
        disabled={!detailing.affordable}
      />
    </Card>
  );
}
