import type {
  AvailableImprovement,
  AvailableUnit,
  OwnedBusinessDetail,
} from '@/application/businessDetailView';
import { Card } from '@/ui/Card';
import { Section } from '@/ui/Section';

import { BusinessUpgradeRow } from './BusinessUpgradeRow';
import { UnitRow } from './UnitRow';

export function GrowSection({
  detail,
  onUnit,
  onImprove,
}: {
  detail: OwnedBusinessDetail;
  onUnit: (unit: AvailableUnit) => void;
  onImprove: (improvement: AvailableImprovement) => void;
}) {
  return (
    <Section title="Grow" note="Paid from this business's treasury">
      <Card>
        <UnitRow unit={detail.unit} unitName={detail.business.unitName} onReview={onUnit} />
        {detail.improvements.map((improvement) => (
          <BusinessUpgradeRow
            key={improvement.track}
            improvement={improvement}
            maxLevel={detail.maxTrackLevel}
            onReview={onImprove}
          />
        ))}
      </Card>
    </Section>
  );
}
