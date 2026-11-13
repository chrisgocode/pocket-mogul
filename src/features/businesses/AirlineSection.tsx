import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import { Section } from '@/ui/Section';

import { AirlineCoachMark } from './AirlineCoachMark';
import type { AirlineActions } from './airlineFormat';
import { FuelCard } from './FuelCard';
import { HubCard } from './HubCard';
import { LockedAirlineCard } from './LockedAirlineCard';
import { NetworkCard } from './NetworkCard';

export function AirlineSection({
  detail,
  actions,
}: {
  detail: OwnedBusinessDetail;
  actions: AirlineActions;
}) {
  const { airline } = detail;
  if (airline === undefined) return null;
  if (airline.status === 'locked') return <LockedAirlineCard unlockStage={airline.unlockStage} />;
  return (
    <Section id="mechanic" title="Operations" note="Fuel and the network your fleet flies">
      {airline.coachMark === 'show' ? (
        <AirlineCoachMark unlockStage={airline.unlockStage} onDismiss={actions.dismissCoachMark} />
      ) : null}
      <FuelCard today={airline.today} forecast={airline.forecast} />
      <NetworkCard
        network={airline.network}
        fleet={airline.fleet}
        networks={airline.networks}
        managerHired={detail.managerHired}
        onSelect={actions.setNetwork}
      />
      <HubCard hub={airline.hub} onReview={actions.installHub} />
    </Section>
  );
}
