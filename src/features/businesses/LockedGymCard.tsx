import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { Section } from '@/ui/Section';

import { stageName } from './businessFormat';

export function LockedGymCard({ unlockStage }: { unlockStage: number }) {
  return (
    <Section title="Members" note="Who trains here every day">
      <Card>
        <ListRow
          title="Memberships and classes"
          subtitle="Sign up members on the tier you choose and run classes to keep them"
          value={`Unlocks at ${stageName(unlockStage)}`}
          dimmed
        />
      </Card>
    </Section>
  );
}
