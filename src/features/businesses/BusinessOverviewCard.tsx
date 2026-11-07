import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import { formatMoneyExact, formatRatePerMinute, moneyCents } from '@/domain/money';
import { BranchArt } from '@/ui/BranchArt';
import { Card } from '@/ui/Card';
import { DetailLine } from '@/ui/DetailLine';

import { formatPerDay, stageName } from './businessFormat';

export function BusinessOverviewCard({ detail }: { detail: OwnedBusinessDetail }) {
  const { day, business } = detail;
  const status = detail.operation === 'open' ? 'Open' : 'Closed';
  return (
    <Card>
      <BranchArt branches={detail.stage} />
      <DetailLine label="Status" value={`${status} · ${stageName(detail.stage)}`} />
      <DetailLine
        label="Customers per day"
        value={`${day.served} of ${day.demand} served, capacity ${day.capacity}`}
      />
      <DetailLine
        label={`Price per ${business.customerName}`}
        value={formatMoneyExact(day.priceCents)}
      />
      <DetailLine label="Revenue" value={formatPerDay(day.revenueCents)} />
      <DetailLine label="Upkeep" value={formatPerDay(moneyCents(0n - day.upkeepCents))} />
      <DetailLine
        label="Customer costs"
        value={formatPerDay(moneyCents(0n - day.customerCostsCents))}
      />
      <DetailLine label="Profit" value={formatPerDay(day.profitCents)} emphasis />
      <DetailLine
        label="To your cash"
        value={formatRatePerMinute(detail.cashPerMinuteCents, 'full')}
      />
    </Card>
  );
}
