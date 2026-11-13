import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { Section } from '@/ui/Section';

import { stageName } from './businessFormat';

export function LockedFoodCartCard({ unlockStage }: { unlockStage: number }) {
  return (
    <Section title="Street" note="Where you park and what you serve">
      <Card>
        <ListRow
          title="Spot and menu"
          subtitle="Follow the crowds around town and choose what goes on the menu"
          value={`Unlocks at ${stageName(unlockStage)}`}
          dimmed
        />
      </Card>
    </Section>
  );
}
