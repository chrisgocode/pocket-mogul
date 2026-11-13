import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { Section } from '@/ui/Section';

import { stageName } from './businessFormat';

export function LockedFactoryCard({ unlockStage }: { unlockStage: number }) {
  return (
    <Section title="Factory floor" note="What your lines make and who for">
      <Card>
        <ListRow
          title="Products and bulk orders"
          subtitle="Choose what your lines make and take large standing orders from industry"
          value={`Unlocks at ${stageName(unlockStage)}`}
          dimmed
        />
      </Card>
    </Section>
  );
}
