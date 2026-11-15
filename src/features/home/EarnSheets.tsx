import { BottomSheet } from '@/ui/BottomSheet';
import { Button } from '@/ui/Button';

import { BriefcaseOffer } from './BriefcaseOffer';
import { BriefingCard } from './BriefingCard';
import type { EarnSheetName } from './earnSheet';
import { HomeDecisions } from './HomeDecisions';
import { TapBoostControl } from './TapBoostControl';

export function EarnSheets({ open, onClose }: { open: EarnSheetName; onClose: () => void }) {
  return (
    <BottomSheet visible={open !== 'none'} onRequestClose={onClose}>
      {open === 'daily' ? <BriefingCard /> : null}
      {open === 'boost' ? <TapBoostControl /> : null}
      {open === 'briefcase' ? <BriefcaseOffer /> : null}
      {open === 'alerts' ? <HomeDecisions onLeave={onClose} /> : null}
      <Button label="Close" variant="secondary" onPress={onClose} />
    </BottomSheet>
  );
}
