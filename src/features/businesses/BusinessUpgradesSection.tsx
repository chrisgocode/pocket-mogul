import type {
  AvailableBusinessUpgrade,
  OwnedBusinessDetail,
} from '@/application/businessDetailView';
import { Card } from '@/ui/Card';
import { Section } from '@/ui/Section';

import { BusinessUpgradeRow } from './BusinessUpgradeRow';

export function BusinessUpgradesSection({
  detail,
  milestoneEveryLevels,
  onReview,
}: {
  detail: OwnedBusinessDetail;
  milestoneEveryLevels: number;
  onReview: (upgrade: AvailableBusinessUpgrade) => void;
}) {
  return (
    <Section
      title="Improvements"
      note={`Every ${milestoneEveryLevels} total levels adds a milestone bonus`}
    >
      <Card>
        {detail.upgrades.map((upgrade) => (
          <BusinessUpgradeRow
            key={upgrade.track}
            upgrade={upgrade}
            maxLevel={detail.maxTrackLevel}
            onReview={onReview}
          />
        ))}
      </Card>
    </Section>
  );
}
