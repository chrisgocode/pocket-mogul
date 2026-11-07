import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import { Card } from '@/ui/Card';
import { Section } from '@/ui/Section';

import { dayCount } from './businessFormat';
import { ActiveIncidentRow } from './ActiveIncidentRow';
import type { InsuranceChange } from './InsuranceButton';
import { RiskRow } from './RiskRow';

function riskNote(safeDaysLeft: number): string {
  if (safeDaysLeft > 0) return `No incidents for ${dayCount(safeDaysLeft)} more`;
  return 'An incident can strike at the start of any day; insurance softens it';
}

export function RisksSection({
  detail,
  onInsurance,
}: {
  detail: OwnedBusinessDetail;
  onInsurance: (change: InsuranceChange) => void;
}) {
  return (
    <Section title="Risks" note={riskNote(detail.risks.safeDaysLeft)}>
      <Card>
        <ActiveIncidentRow detail={detail} />
        {detail.risks.options.map((option) => (
          <RiskRow key={option.incident.id} option={option} onInsurance={onInsurance} />
        ))}
      </Card>
    </Section>
  );
}
