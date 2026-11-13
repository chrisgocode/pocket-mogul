import type { ServiceLevelView, ServiceView } from '@/application/laundromatView';
import { formatMoneyExact } from '@/domain/money';
import { Card } from '@/ui/Card';
import { ChoiceRow } from '@/ui/ChoiceRow';
import { DetailLine } from '@/ui/DetailLine';

import { serviceLevelName } from './laundromatFormat';

function serviceNote(service: ServiceView): string {
  if (service.attendants === 0) return 'Hire an attendant in Staff to offer service washes';
  const current = service.levels.find((option) => option.level === service.level);
  const loads = current === undefined ? 0 : current.loads;
  return `${loads} drop-off loads a day · One level per attendant`;
}

const levelFacts = (option: ServiceLevelView) =>
  option.level === 0
    ? `${formatMoneyExact(option.profitCents)}/day`
    : `${formatMoneyExact(option.feesCents)} fees · ${formatMoneyExact(option.profitCents)}/day`;

export function ServiceWashCard({
  service,
  onSelect,
}: {
  service: ServiceView;
  onSelect: (level: number) => void;
}) {
  return (
    <Card>
      <ChoiceRow
        title="Service washes"
        note={serviceNote(service)}
        choices={service.levels.map((option) => ({
          value: String(option.level),
          label: serviceLevelName(option.level),
        }))}
        selected={String(service.level)}
        onSelect={(level) => onSelect(Number(level))}
      />
      {service.levels.map((option) => (
        <DetailLine
          key={option.level}
          label={serviceLevelName(option.level)}
          value={levelFacts(option)}
        />
      ))}
    </Card>
  );
}
