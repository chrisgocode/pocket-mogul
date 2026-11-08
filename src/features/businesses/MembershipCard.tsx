import type { MembershipView } from '@/application/carWashView';
import { PRICE_LEVELS } from '@/domain/business/definition';
import { formatMoneyExact } from '@/domain/money';
import { Card } from '@/ui/Card';
import { ChoiceRow } from '@/ui/ChoiceRow';
import { ListRow } from '@/ui/ListRow';

import { PRICE_LEVEL_NAMES } from './businessFormat';
import type { CarWashActions } from './carWashFormat';

function capNote(memberships: MembershipView, managerHired: boolean): string {
  if (managerHired) return 'Your manager raises the cap ahead of forecast rain';
  return `Members may use up to this share of bay time · Room for ${memberships.limit}`;
}

export function MembershipCard({
  memberships,
  managerHired,
  actions,
}: {
  memberships: MembershipView;
  managerHired: boolean;
  actions: CarWashActions;
}) {
  const levels = PRICE_LEVELS.map((level) => ({ value: level, label: PRICE_LEVEL_NAMES[level] }));
  const caps = memberships.capChoices.map((cap) => ({ value: String(cap), label: `${cap}%` }));
  return (
    <Card>
      <ListRow
        title="Members"
        subtitle={`${formatMoneyExact(memberships.feeCents)} a day each · ${memberships.joinsPerDay} join a day`}
        value={`${memberships.members}/${memberships.limit}`}
      />
      <ChoiceRow
        title="Membership price"
        note="Cheaper memberships sign up more members"
        choices={levels}
        selected={memberships.level}
        onSelect={actions.setMembershipPrice}
      />
      <ChoiceRow
        title="Member cap"
        note={capNote(memberships, managerHired)}
        choices={caps}
        selected={String(memberships.capPercent)}
        onSelect={(cap) => actions.setMemberCap(Number(cap))}
      />
    </Card>
  );
}
