import { selectRentIncomePerMinuteCents } from '@/application/cashView';
import { selectPortfolio } from '@/application/portfolioView';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { useMoneyFormat } from '@/features/game/useMoneyFormat';
import { StatChips } from '@/ui/StatChips';

export function PropertySummary() {
  const snapshot = useGameSnapshot();
  const content = getContent();
  const format = useMoneyFormat();
  const valueCents = selectPortfolio(snapshot, content).worth.propertiesCents;
  const rentCents = selectRentIncomePerMinuteCents(snapshot, content);
  const owned = snapshot.state.properties.length;
  return (
    <StatChips
      stats={[
        {
          label: 'Value',
          value: format.short(valueCents),
          accessibilityLabel: `Property value, ${format.money(valueCents)}`,
        },
        { label: 'Owned', value: String(owned), accessibilityLabel: `${owned} owned` },
        {
          label: 'Net rent',
          value: format.shortRate(rentCents),
          trend: 'gain',
          accessibilityLabel: `Net rent / min, ${format.rate(rentCents)}`,
        },
      ]}
    />
  );
}
