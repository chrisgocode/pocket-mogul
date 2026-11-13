import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import { Section } from '@/ui/Section';

import { ConferenceCard } from './ConferenceCard';
import { HotelCoachMark } from './HotelCoachMark';
import type { HotelActions } from './hotelFormat';
import { LockedHotelCard } from './LockedHotelCard';
import { RatePlanCard } from './RatePlanCard';
import { SeasonCard } from './SeasonCard';
import { StarsCard } from './StarsCard';

export function HotelSection({
  detail,
  actions,
}: {
  detail: OwnedBusinessDetail;
  actions: HotelActions;
}) {
  const { hotel } = detail;
  if (hotel === undefined) return null;
  if (hotel.status === 'locked') return <LockedHotelCard unlockStage={hotel.unlockStage} />;
  return (
    <Section id="mechanic" title="Front desk" note="The season, your stars and your rates">
      {hotel.coachMark === 'show' ? (
        <HotelCoachMark unlockStage={hotel.unlockStage} onDismiss={actions.dismissCoachMark} />
      ) : null}
      <SeasonCard
        season={hotel.season}
        guestsPercent={hotel.guestsPercent}
        forecast={hotel.forecast}
      />
      <StarsCard stars={hotel.stars} />
      <RatePlanCard
        rates={hotel.rates}
        managerHired={detail.managerHired}
        onSelect={actions.setSeasonRate}
      />
      <ConferenceCard conference={hotel.conference} onReview={actions.installConference} />
    </Section>
  );
}
