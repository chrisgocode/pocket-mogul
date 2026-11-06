import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import { formatRatePerMinute, moneyCents } from '@/domain/money';
import { BranchArt } from '@/ui/BranchArt';
import { Card } from '@/ui/Card';
import { DetailLine } from '@/ui/DetailLine';

import { formatBonus } from './businessFormat';

export function BusinessIncomeCard({ detail }: { detail: OwnedBusinessDetail }) {
  const { income } = detail;
  const managerBonus =
    detail.manager.status === 'hired' ? formatBonus(income.managerBonusBps) : 'Not hired';
  return (
    <Card>
      <BranchArt branches={detail.branches} />
      <DetailLine label="Revenue" value={formatRatePerMinute(income.revenueCents, 'full')} />
      <DetailLine
        label="Operating costs"
        value={formatRatePerMinute(moneyCents(0n - income.costsCents), 'full')}
      />
      <DetailLine label="Milestone bonus" value={formatBonus(income.milestoneBonusBps)} />
      <DetailLine label="Manager bonus" value={managerBonus} />
      <DetailLine
        label="Net profit"
        value={formatRatePerMinute(income.netPerMinuteCents, 'full')}
        emphasis
      />
    </Card>
  );
}
