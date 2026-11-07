import { ACTIVITY_ENTRIES_KEPT } from '@/domain/activity';
import { formatMoneyExact } from '@/domain/money';
import { useGameSnapshot } from '@/features/game/GameContext';
import { Card } from '@/ui/Card';
import { DetailLine } from '@/ui/DetailLine';
import { AppText } from '@/ui/Typography';

export function LifetimeTotals() {
  const { lifetime } = useGameSnapshot().state.activity;
  return (
    <Card>
      <AppText variant="heading" accessibilityRole="header">
        Lifetime
      </AppText>
      <DetailLine label="Entries recorded" value={lifetime.entries.toLocaleString('en-US')} />
      <DetailLine
        label="Spent on purchases, upgrades and buys"
        value={formatMoneyExact(lifetime.spentCents)}
      />
      <DetailLine label="Received from sales" value={formatMoneyExact(lifetime.proceedsCents)} />
      <AppText variant="caption" muted>
        {`History keeps the newest ${ACTIVITY_ENTRIES_KEPT.toLocaleString('en-US')} entries. Lifetime totals keep counting.`}
      </AppText>
    </Card>
  );
}
