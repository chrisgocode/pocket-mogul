import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import { Section } from '@/ui/Section';

import type { CarWashActions } from './carWashFormat';
import { CarWashCoachMark } from './CarWashCoachMark';
import { DetailingCard } from './DetailingCard';
import { LockedCarWashCard } from './LockedCarWashCard';
import { MembershipCard } from './MembershipCard';
import { WashPackagesCard } from './WashPackagesCard';
import { WeatherCard } from './WeatherCard';

export function CarWashSection({
  detail,
  actions,
}: {
  detail: OwnedBusinessDetail;
  actions: CarWashActions;
}) {
  const { carWash } = detail;
  if (carWash === undefined) return null;
  if (carWash.status === 'locked') return <LockedCarWashCard unlockStage={carWash.unlockStage} />;
  return (
    <Section title="Washes" note="Packages, weather and memberships">
      {carWash.coachMark === 'show' ? (
        <CarWashCoachMark onDismiss={actions.dismissCoachMark} />
      ) : null}
      <WeatherCard today={carWash.today} forecast={carWash.forecast} />
      <WashPackagesCard packages={carWash.packages} actions={actions} />
      <MembershipCard
        memberships={carWash.memberships}
        managerHired={detail.managerHired}
        actions={actions}
      />
      <DetailingCard detailing={carWash.detailing} onReview={actions.installDetailing} />
    </Section>
  );
}
