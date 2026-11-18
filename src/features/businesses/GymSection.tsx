import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import { Section } from '@/ui/Section';

import { AllHoursCard } from './AllHoursCard';
import { GymClassesCard } from './GymClassesCard';
import { GymCoachMark } from './GymCoachMark';
import type { GymActions } from './gymFormat';
import { GymMembersCard } from './GymMembersCard';
import { LockedMechanicCard } from './LockedMechanicCard';
import { LOCKED_TEXT } from './lockedMechanicText';

export function GymSection({
  detail,
  actions,
}: {
  detail: OwnedBusinessDetail;
  actions: GymActions;
}) {
  const { gym } = detail;
  if (gym === undefined) return null;
  if (gym.status === 'locked')
    return <LockedMechanicCard text={LOCKED_TEXT.gym} unlockStage={gym.unlockStage} />;
  return (
    <Section id="mechanic" title="Members" note="Who pays every day and what keeps them">
      {gym.coachMark === 'show' ? (
        <GymCoachMark unlockStage={gym.unlockStage} onDismiss={actions.dismissCoachMark} />
      ) : null}
      <GymMembersCard
        membership={gym.membership}
        tier={gym.tier}
        tiers={gym.tiers}
        onSelect={actions.setTier}
      />
      <GymClassesCard
        classes={gym.classes}
        managerHired={detail.managerHired}
        onSelect={actions.setClassLevel}
      />
      <AllHoursCard allHours={gym.allHours} onReview={actions.installAllHours} />
    </Section>
  );
}
