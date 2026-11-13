import { selectPortfolio } from '@/application/portfolioView';
import { getContent } from '@/content';
import { useGameSnapshot } from '@/features/game/GameContext';
import { formatCashChange } from '@/features/game/priceFormat';
import { DetailLine } from '@/ui/DetailLine';
import { Disclosure } from '@/ui/Disclosure';
import { PageTitle } from '@/ui/PageTitle';
import { Screen } from '@/ui/Screen';
import { Section } from '@/ui/Section';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { useSegment } from '@/ui/state/useSegment';
import { AllocationCard } from './AllocationCard';
import { CollectionShelf } from './CollectionShelf';
import { ProfileIncome } from './ProfileIncome';
import { ProfileLinks } from './ProfileLinks';
import { HoldingsCard } from './HoldingsCard';
import { IncomeCard } from './IncomeCard';
import { RecentActivity } from './RecentActivity';
import { WorthCard } from './WorthCard';
const VIEWS = ['Summary', 'Holdings', 'Activity'] as const;
export function PortfolioScreen() {
  const view = selectPortfolio(useGameSnapshot(), getContent());
  const segment = useSegment<string>('Summary');
  return (
    <Screen>
      <PageTitle title="Profile" />
      <ProfileLinks />
      <WorthCard worth={view.worth} />
      <ProfileIncome />
      <CollectionShelf />
      <SegmentedControl
        options={VIEWS.map((label) => ({ value: label, label }))}
        selected={segment.selected}
        onSelect={segment.select}
      />
      {segment.selected === 'Summary' ? (
        <>
          <Section title="Allocation">
            <AllocationCard worth={view.worth} />
          </Section>
          <DetailLine
            label="Unrealized P&L"
            value={formatCashChange(view.results.unrealizedCents)}
          />
          <DetailLine label="Realized P&L" value={formatCashChange(view.results.realizedCents)} />
          <Disclosure title="Income by source">
            <IncomeCard income={view.income} />
          </Disclosure>
        </>
      ) : null}
      {segment.selected === 'Holdings' ? <HoldingsCard holdings={view.holdings} /> : null}
      {segment.selected === 'Activity' ? <RecentActivity /> : null}
    </Screen>
  );
}
