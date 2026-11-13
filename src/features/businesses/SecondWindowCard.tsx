import type { AvailableSecondWindow, SecondWindowOption } from '@/application/foodCartView';
import { priceLabel } from '@/features/game/priceFormat';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';

import { stageName } from './businessFormat';

const EFFECT = 'A second serving window, so every cart serves more meals a day';

export function SecondWindowCard({
  secondWindow,
  onReview,
}: {
  secondWindow: SecondWindowOption;
  onReview: (secondWindow: AvailableSecondWindow) => void;
}) {
  if (secondWindow.status === 'locked') {
    const value = `Unlocks at ${stageName(secondWindow.unlockStage)}`;
    return (
      <Card>
        <ListRow title="Second window" subtitle={EFFECT} value={value} dimmed />
      </Card>
    );
  }
  if (secondWindow.status === 'installed') {
    return (
      <Card>
        <ListRow title="Second window" subtitle={EFFECT} value="Added" />
      </Card>
    );
  }
  return (
    <Card>
      <ListRow title="Second window" subtitle={EFFECT} />
      <Button
        label={priceLabel('Add a second window', secondWindow)}
        onPress={() => onReview(secondWindow)}
        disabled={!secondWindow.affordable}
      />
    </Card>
  );
}
