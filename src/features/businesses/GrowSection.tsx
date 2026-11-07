import type {
  AvailableImprovement,
  AvailableUnit,
  OwnedBusinessDetail,
  ReadyStage,
} from '@/application/businessDetailView';
import { Card } from '@/ui/Card';
import { Section } from '@/ui/Section';

import { BusinessUpgradeRow } from './BusinessUpgradeRow';
import { StageRow } from './StageRow';
import { UnitRow } from './UnitRow';

export function GrowSection({
  detail,
  onUnit,
  onImprove,
  onStage,
}: {
  detail: OwnedBusinessDetail;
  onUnit: (unit: AvailableUnit) => void;
  onImprove: (improvement: AvailableImprovement) => void;
  onStage: (stage: ReadyStage) => void;
}) {
  return (
    <Section title="Grow" note="Paid from this business's treasury">
      <Card>
        <StageRow stage={detail.stageUpgrade} onReview={onStage} />
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
