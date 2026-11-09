import { selectCashFlow } from '@/application/cashFlowView';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { useMoneyFormat } from '@/features/game/useMoneyFormat';
import { StatPair } from '@/ui/StatPair';
export function ProfileIncome() {
  const format = useMoneyFormat();
  const flow = selectCashFlow(useGameSnapshot(), getContent());
  return (
    <StatPair
      left={{ label: 'Cash flow', value: format.rate(flow.netCents) }}
      right={{ label: 'Debt recovery', value: format.rate(flow.recoveryCents) }}
    />
  );
}
