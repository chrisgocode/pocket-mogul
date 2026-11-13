import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { Section } from '@/ui/Section';

import { stageName } from './businessFormat';

export function LockedBakeryCard({ unlockStage }: { unlockStage: number }) {
  return (
    <Section title="Ovens" note="How much you bake and who you bake for">
      <Card>
        <ListRow
          title="Oven schedule and wholesale"
          subtitle="Set how much to bake each day and take standing orders from wholesale clients"
          value={`Unlocks at ${stageName(unlockStage)}`}
          dimmed
        />
      </Card>
    </Section>
  );
}
