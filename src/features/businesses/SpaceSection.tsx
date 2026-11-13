import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import { Section } from '@/ui/Section';

import { BoostersCard } from './BoostersCard';
import { LaunchCadenceCard } from './LaunchCadenceCard';
import { LockedSpaceCard } from './LockedSpaceCard';
import { PayloadContractsCard } from './PayloadContractsCard';
import { SpaceCoachMark } from './SpaceCoachMark';
import type { SpaceActions } from './spaceFormat';

export function SpaceSection({
  detail,
  actions,
}: {
  detail: OwnedBusinessDetail;
  actions: SpaceActions;
}) {
  const { space } = detail;
  if (space === undefined) return null;
  if (space.status === 'locked') return <LockedSpaceCard unlockStage={space.unlockStage} />;
  return (
    <Section id="mechanic" title="Mission control" note="Weather, cadence and payload contracts">
      {space.coachMark === 'show' ? (
        <SpaceCoachMark unlockStage={space.unlockStage} onDismiss={actions.dismissCoachMark} />
      ) : null}
      <LaunchCadenceCard
        weather={space.weather}
        forecast={space.forecast}
        cadence={space.cadence}
        cadences={space.cadences}
        managerHired={detail.managerHired}
        onSelect={actions.setCadence}
      />
      <PayloadContractsCard payloads={space.payloads} onAnswer={actions.answerPayloadOffer} />
      <BoostersCard boosters={space.boosters} onReview={actions.installBoosters} />
    </Section>
  );
}
