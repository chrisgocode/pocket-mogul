import { selectCashFlow } from '@/application/cashFlowView';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { cashTrend } from '@/features/game/priceFormat';
import { useMoneyFormat } from '@/features/game/useMoneyFormat';
import { StatChips } from '@/ui/StatChips';

export function ProfileIncome() {
  const format = useMoneyFormat();
  const flow = selectCashFlow(useGameSnapshot(), getContent());
  return (
    <StatChips
      stats={[
        {
          label: 'Cash flow',
          value: format.shortRate(flow.netCents),
          trend: cashTrend(flow.netCents),
          accessibilityLabel: `Cash flow, ${format.rate(flow.netCents)}`,
        },
        {
          label: 'Debt recovery',
          value: format.shortRate(flow.recoveryCents),
          accessibilityLabel: `Debt recovery, ${format.rate(flow.recoveryCents)}`,
        },
      ]}
    />
  );
}
