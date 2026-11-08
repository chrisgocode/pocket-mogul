import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { Section } from '@/ui/Section';

import { stageName } from './businessFormat';

export function LockedCarWashCard({ unlockStage }: { unlockStage: number }) {
  return (
    <Section title="Washes" note="What your bays sell and who washes here">
      <Card>
        <ListRow
          title="Packages and memberships"
          subtitle="Choose the packages you sell, plan around the weather and sign up members"
          value={`Unlocks at ${stageName(unlockStage)}`}
          dimmed
        />
      </Card>
    </Section>
  );
}
