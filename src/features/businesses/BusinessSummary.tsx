import { selectBusinessWorth } from '@/application/businessWorthView';
import { selectBusinessIncomePerMinuteCents } from '@/application/cashView';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { useMoneyFormat } from '@/features/game/useMoneyFormat';
import { StatChips } from '@/ui/StatChips';

export function BusinessSummary() {
  const snapshot = useGameSnapshot();
  const content = getContent();
  const format = useMoneyFormat();
  const worthCents = selectBusinessWorth(snapshot, content);
  const incomeCents = selectBusinessIncomePerMinuteCents(snapshot, content);
  const owned = snapshot.state.businesses.length;
  return (
    <StatChips
      stats={[
        {
          label: 'Worth',
          value: format.short(worthCents),
          accessibilityLabel: `Business net worth, ${format.money(worthCents)}`,
        },
        { label: 'Owned', value: String(owned), accessibilityLabel: `${owned} owned` },
        {
          label: 'To cash',
          value: format.shortRate(incomeCents),
          trend: 'gain',
          accessibilityLabel: `${format.rate(incomeCents)} to cash`,
        },
      ]}
    />
  );
}
