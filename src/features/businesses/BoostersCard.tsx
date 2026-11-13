import type { AvailableBoosters, BoostersOption } from '@/application/spaceView';
import { priceLabel } from '@/features/game/priceFormat';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';

import { stageName } from './businessFormat';

const EFFECT = 'Boosters land and fly again, so every pad launches more payloads a day';

export function BoostersCard({
  boosters,
  onReview,
}: {
  boosters: BoostersOption;
  onReview: (boosters: AvailableBoosters) => void;
}) {
  if (boosters.status === 'locked') {
    const value = `Unlocks at ${stageName(boosters.unlockStage)}`;
    return (
      <Card>
        <ListRow title="Reusable boosters" subtitle={EFFECT} value={value} dimmed />
      </Card>
    );
  }
  if (boosters.status === 'installed') {
    return (
      <Card>
        <ListRow title="Reusable boosters" subtitle={EFFECT} value="Added" />
      </Card>
    );
  }
  return (
    <Card>
      <ListRow title="Reusable boosters" subtitle={EFFECT} />
      <Button
        label={priceLabel('Add reusable boosters', boosters)}
        onPress={() => onReview(boosters)}
        disabled={!boosters.affordable}
      />
    </Card>
  );
}
