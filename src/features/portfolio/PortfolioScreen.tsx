import { formatMoneyExact, moneyCents } from '@/domain/money';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';

const ZERO = formatMoneyExact(moneyCents(0));

export function PortfolioScreen() {
  return (
    <Screen>
      <Card>
        <ListRow title="Cash" value={ZERO} />
        <ListRow title="Owned assets" value={ZERO} />
        <ListRow title="Net worth" value={ZERO} />
      </Card>
      <EmptyState
        title="Nothing to show yet"
        message="Your holdings, income and activity history will appear here."
      />
    </Screen>
  );
}
