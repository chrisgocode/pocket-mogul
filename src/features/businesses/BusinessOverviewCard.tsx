import { BusinessTaxLines } from '@/features/taxes/BusinessTaxLines';
import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import { BusinessDayDetails } from './BusinessDayDetails';
import { Section } from '@/ui/Section';
import { Card } from '@/ui/Card';

export function BusinessOverviewCard({ detail }: { detail: OwnedBusinessDetail }) {
  const { business } = detail;
  return (
    <Section title="Today">
      <Card>
        <BusinessDayDetails detail={detail} />
        <BusinessTaxLines businessId={business.id} />
      </Card>
    </Section>
  );
}
