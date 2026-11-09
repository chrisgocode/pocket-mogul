import { BusinessTaxLines } from '@/features/taxes/BusinessTaxLines';
import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import { formatMoneyExact, formatRatePerMinute } from '@/domain/money';
import { BusinessDayDetails } from './BusinessDayDetails';
import { Section } from '@/ui/Section';
import { StatPair } from '@/ui/StatPair';
import { Card } from '@/ui/Card';
import { DetailLine } from '@/ui/DetailLine';

export function BusinessOverviewCard({ detail }: { detail: OwnedBusinessDetail }) {
  const { day, business } = detail;
  return (
    <Section title="Overview">
      <Card>
        <StatPair
          left={{ label: 'Profit / business day', value: formatMoneyExact(day.profitCents) }}
          right={{ label: 'Treasury', value: formatMoneyExact(detail.treasuryCents) }}
        />
        <BusinessDayDetails detail={detail} />
        <BusinessTaxLines businessId={business.id} />
        <DetailLine
          label="To your cash"
          value={formatRatePerMinute(detail.cashPerMinuteCents, 'full')}
        />
      </Card>
    </Section>
  );
}
