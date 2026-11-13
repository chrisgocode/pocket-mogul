import type { AllHoursOption, AvailableAllHours } from '@/application/gymView';
import { priceLabel } from '@/features/game/priceFormat';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';

import { stageName } from './businessFormat';

const EFFECT = 'Studios stay open all night, so each holds more visits a day';

export function AllHoursCard({
  allHours,
  onReview,
}: {
  allHours: AllHoursOption;
  onReview: (allHours: AvailableAllHours) => void;
}) {
  if (allHours.status === 'locked') {
    const value = `Unlocks at ${stageName(allHours.unlockStage)}`;
    return (
      <Card>
        <ListRow title="24-hour access" subtitle={EFFECT} value={value} dimmed />
      </Card>
    );
  }
  if (allHours.status === 'installed') {
    return (
      <Card>
        <ListRow title="24-hour access" subtitle={EFFECT} value="Added" />
      </Card>
    );
  }
  return (
    <Card>
      <ListRow title="24-hour access" subtitle={EFFECT} />
      <Button
        label={priceLabel('Add 24-hour access', allHours)}
        onPress={() => onReview(allHours)}
        disabled={!allHours.affordable}
      />
    </Card>
  );
}
