import { selectPortfolio } from '@/application/portfolioView';
import { selectRentIncomePerMinuteCents } from '@/application/cashView';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { useMoneyFormat } from '@/features/game/useMoneyFormat';
import { StatPair } from '@/ui/StatPair';
export function PropertySummary() {
  const snapshot = useGameSnapshot();
  const content = getContent();
  const format = useMoneyFormat();
  return (
    <StatPair
      left={{
        label: 'Property value',
        value: format.money(selectPortfolio(snapshot, content).worth.propertiesCents),
      }}
      right={{
        label: 'Net rent / min',
        value: format.rate(selectRentIncomePerMinuteCents(snapshot, content)),
      }}
    />
  );
}
