import type { AutomationOption, AvailableAutomation } from '@/application/factoryView';
import { priceLabel } from '@/features/game/priceFormat';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';

import { stageName } from './businessFormat';

const EFFECT = 'Robots run the lines, so every batch costs less to make';

export function AutomationCard({
  automation,
  onReview,
}: {
  automation: AutomationOption;
  onReview: (automation: AvailableAutomation) => void;
}) {
  if (automation.status === 'locked') {
    const value = `Unlocks at ${stageName(automation.unlockStage)}`;
    return (
      <Card>
        <ListRow title="Automation" subtitle={EFFECT} value={value} dimmed />
      </Card>
    );
  }
  if (automation.status === 'installed') {
    return (
      <Card>
        <ListRow title="Automation" subtitle={EFFECT} value="Added" />
      </Card>
    );
  }
  return (
    <Card>
      <ListRow title="Automation" subtitle={EFFECT} />
      <Button
        label={priceLabel('Add automation', automation)}
        onPress={() => onReview(automation)}
        disabled={!automation.affordable}
      />
    </Card>
  );
}
