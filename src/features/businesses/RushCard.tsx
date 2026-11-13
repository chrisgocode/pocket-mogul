import type { RushPlanView, RushView } from '@/application/coffeeKioskView';
import type { RushPlan } from '@/domain/business/coffeeKioskRules';
import { formatMoneyExact } from '@/domain/money';
import { Card } from '@/ui/Card';
import { ChoiceRow } from '@/ui/ChoiceRow';
import { DetailLine } from '@/ui/DetailLine';
import { ListRow } from '@/ui/ListRow';

import { PLAN_NAMES, PLAN_NOTES } from './coffeeKioskFormat';

const planLabel = (option: RushPlanView) =>
  option.best ? `${PLAN_NAMES[option.plan]} ★` : PLAN_NAMES[option.plan];

function rushNote(rush: RushView): string {
  if (rush.walkedAway === 0) return `All ${rush.customers} rush customers served`;
  return `${rush.served} of ${rush.customers} rush customers served`;
}

export function RushCard({
  rush,
  plan,
  plans,
  managerHired,
  onSelect,
}: {
  rush: RushView;
  plan: RushPlan;
  plans: readonly RushPlanView[];
  managerHired: boolean;
  onSelect: (plan: RushPlan) => void;
}) {
  const note = managerHired ? 'Your manager picks the most profitable plan' : PLAN_NOTES[plan];
  return (
    <Card>
      <ListRow
        title="Morning rush"
        subtitle={rushNote(rush)}
        value={rush.walkedAway === 0 ? 'No one waits' : `${rush.walkedAway} walk away`}
      />
      <ChoiceRow
        title="Rush plan"
        note={note}
        choices={plans.map((option) => ({ value: option.plan, label: planLabel(option) }))}
        selected={plan}
        onSelect={onSelect}
      />
      {plans.map((option) => (
        <DetailLine
          key={option.plan}
          label={PLAN_NAMES[option.plan]}
          value={`${formatMoneyExact(option.profitCents)}/day`}
        />
      ))}
    </Card>
  );
}
