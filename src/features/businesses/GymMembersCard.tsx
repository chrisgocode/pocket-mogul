import type { GymMembersView, GymTierView } from '@/application/gymView';
import type { GymTier } from '@/domain/business/gymRules';
import { formatMoneyExact } from '@/domain/money';
import { Card } from '@/ui/Card';
import { ChoiceRow } from '@/ui/ChoiceRow';
import { DetailLine } from '@/ui/DetailLine';
import { ListRow } from '@/ui/ListRow';

import { bpsAsPercent, GYM_TIER_NAMES } from './gymFormat';

const tierChoice = (option: GymTierView) => ({
  value: option.tier,
  label: GYM_TIER_NAMES[option.tier],
});

const tierFacts = (option: GymTierView) =>
  `${formatMoneyExact(option.feeCents)} a day · ${bpsAsPercent(option.churnBps)} leave a day · settles at ${option.steadyMembers}`;

export function GymMembersCard({
  membership,
  tier,
  tiers,
  onSelect,
}: {
  membership: GymMembersView;
  tier: GymTier;
  tiers: readonly GymTierView[];
  onSelect: (tier: GymTier) => void;
}) {
  const flow = `${membership.joinsPerDay} join and ${membership.leaversPerDay} leave a day`;
  const studio = `${membership.visits} of ${membership.studioVisits} studio visits`;
  return (
    <Card>
      <ListRow
        title="Members"
        subtitle={`${flow} · ${studio}`}
        value={`${membership.members}/${membership.limit}`}
      />
      <ChoiceRow
        title="Tier on sale"
        note="Every member pays the tier on sale. A higher tier loses members faster"
        choices={tiers.map(tierChoice)}
        selected={tier}
        onSelect={onSelect}
      />
      {tiers.map((option) => (
        <DetailLine
          key={option.tier}
          label={GYM_TIER_NAMES[option.tier]}
          value={tierFacts(option)}
        />
      ))}
    </Card>
  );
}
