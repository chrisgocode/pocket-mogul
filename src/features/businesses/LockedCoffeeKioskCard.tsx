import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { Section } from '@/ui/Section';

import { stageName } from './businessFormat';

export function LockedCoffeeKioskCard({ unlockStage }: { unlockStage: number }) {
  return (
    <Section title="Counter" note="How you serve the rush and what you brew">
      <Card>
        <ListRow
          title="Morning rush and beans"
          subtitle="Plan for the morning rush and choose the beans you brew"
          value={`Unlocks at ${stageName(unlockStage)}`}
          dimmed
        />
      </Card>
    </Section>
  );
}
