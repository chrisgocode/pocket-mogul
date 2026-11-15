import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { useSegment } from '@/ui/state/useSegment';

import type { BusinessAction } from './businessAction';
import { BusinessHeading } from './BusinessHeading';
import { BusinessMoreTab } from './BusinessMoreTab';
import { BusinessRunTab, type RunTabActions } from './BusinessRunTab';
import { BusinessStats } from './BusinessStats';
import { BUSINESS_TABS, type BusinessTab } from './businessTabs';
import { GrowSection } from './GrowSection';
import { StaffSection } from './StaffSection';

type OwnedBusinessDetailsProps = {
  detail: OwnedBusinessDetail;
  initialTab: BusinessTab;
  onReview: (action: BusinessAction) => void;
  run: RunTabActions;
};

export function OwnedBusinessDetails({
  detail,
  initialTab,
  onReview,
  run,
}: OwnedBusinessDetailsProps) {
  const { business } = detail;
  const tab = useSegment<BusinessTab>(initialTab);
  return (
    <>
      <BusinessHeading detail={detail} />
      <BusinessStats detail={detail} />
      <SegmentedControl options={BUSINESS_TABS} selected={tab.selected} onSelect={tab.select} />
      {tab.selected === 'grow' ? (
        <GrowSection
          detail={detail}
          onUnit={(unit) => onReview({ kind: 'unit', business, unit })}
          onImprove={(improvement) => onReview({ kind: 'improve', business, improvement })}
          onStage={(stage) => onReview({ kind: 'stage', business, stage })}
        />
      ) : null}
      {tab.selected === 'run' ? <BusinessRunTab detail={detail} actions={run} /> : null}
      {tab.selected === 'staff' ? <StaffSection detail={detail} onReview={onReview} /> : null}
      {tab.selected === 'more' ? <BusinessMoreTab detail={detail} onReview={onReview} /> : null}
    </>
  );
}
