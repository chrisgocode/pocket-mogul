import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import { Card } from '@/ui/Card';
import { Section } from '@/ui/Section';

import type { BusinessAction } from './businessAction';
import { StaffRow } from './StaffRow';

export function StaffSection({
  detail,
  onReview,
}: {
  detail: OwnedBusinessDetail;
  onReview: (action: BusinessAction) => void;
}) {
  const { business } = detail;
  return (
    <Section title="Staff">
      <Card>
        {detail.staff
          .filter((option) => option.status !== 'locked')
          .map((option) => (
            <StaffRow
              key={option.role}
              business={business}
              option={option}
              onHire={(hire) => onReview({ kind: 'hire', business, hire })}
              onFire={({ role, count }) => onReview({ kind: 'fire', business, role, count })}
            />
          ))}
      </Card>
    </Section>
  );
}
