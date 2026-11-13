import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { Section } from '@/ui/Section';

import { synergiesNote, synergyEffect, synergySubtitle } from './synergyFormat';

export function SynergiesSection({ detail }: { detail: OwnedBusinessDetail }) {
  const { synergies } = detail;
  if (synergies.length === 0) return null;
  return (
    <Section title="Synergies" note={synergiesNote(synergies)}>
      <Card>
        {synergies.map((synergy) => (
          <ListRow
            key={synergy.id}
            title={synergy.name}
            subtitle={synergySubtitle(synergy)}
            value={synergyEffect(synergy)}
            dimmed={synergy.status === 'locked'}
          />
        ))}
      </Card>
    </Section>
  );
}
