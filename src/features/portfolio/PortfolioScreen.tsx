import { selectPortfolio } from '@/application/portfolioView';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { formatCashChange } from '@/features/game/priceFormat';
import { Card } from '@/ui/Card';
import { DetailLine } from '@/ui/DetailLine';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';
import { Section } from '@/ui/Section';

import { HoldingsCard } from './HoldingsCard';
import { IncomeCard } from './IncomeCard';
import { RecentActivity } from './RecentActivity';
import { WorthCard } from './WorthCard';

export function PortfolioScreen() {
  const view = selectPortfolio(useGameSnapshot(), getContent());
  const { holdings, results } = view;
  const holdsAnything =
    holdings.businesses.length + holdings.properties.length + holdings.positions.length > 0;
  return (
    <Screen>
      <WorthCard worth={view.worth} />
      <Section title="Income by source">
        <IncomeCard income={view.income} />
      </Section>
      <Section title="Holdings">
        {holdsAnything ? (
          <HoldingsCard holdings={holdings} />
        ) : (
          <EmptyState
            title="Nothing owned yet"
            message="Buy a business, a property, or a stock and it will show here."
          />
        )}
      </Section>
      <Section title="Market results" note="Reports only, never added to cash">
        <Card>
          <DetailLine label="Realized" value={formatCashChange(results.realizedCents)} />
          <DetailLine label="Unrealized" value={formatCashChange(results.unrealizedCents)} />
        </Card>
      </Section>
      <Section title="Recent activity">
        <RecentActivity />
      </Section>
    </Screen>
  );
}
