import type {
  AvailableImprovement,
  AvailableUnit,
  OwnedBusinessDetail,
  ReadyStage,
} from '@/application/businessDetailView';
import { Card } from '@/ui/Card';
import { AppText } from '@/ui/Typography';

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
    <>
      <AppText variant="caption" muted>
        Paid from this business's treasury
      </AppText>
      <Card>
        <StageRow stage={detail.stageUpgrade} onReview={onStage} />
        <UnitRow unit={detail.unit} unitName={detail.business.unitName} onBuy={onUnit} />
        {detail.improvements.map((improvement) => (
          <BusinessUpgradeRow
            key={improvement.track}
            improvement={improvement}
            maxLevel={detail.maxTrackLevel}
            onBuy={onImprove}
          />
        ))}
      </Card>
    </>
  );
}
