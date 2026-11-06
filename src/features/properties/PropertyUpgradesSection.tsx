import type {
  AvailablePropertyUpgrade,
  PropertyUpgradeOption,
} from '@/application/propertyDetailView';
import { Card } from '@/ui/Card';
import { Section } from '@/ui/Section';

import { PropertyUpgradeRow } from './PropertyUpgradeRow';

export function PropertyUpgradesSection({
  upgrades,
  onReview,
}: {
  upgrades: readonly PropertyUpgradeOption[];
  onReview: (upgrade: AvailablePropertyUpgrade) => void;
}) {
  return (
    <Section title="Upgrades" note="Upgrades apply at once, even while rented">
      <Card>
        {upgrades.map((upgrade) => (
          <PropertyUpgradeRow key={upgrade.track} upgrade={upgrade} onReview={onReview} />
        ))}
      </Card>
    </Section>
  );
}
