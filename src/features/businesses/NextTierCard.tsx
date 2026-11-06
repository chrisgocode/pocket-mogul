import type { NextTierUnlock } from '@/application/businessesView';
import { formatMoneyExact } from '@/domain/money';
import { Card } from '@/ui/Card';
import { AppText } from '@/ui/Typography';

export function NextTierCard({ unlock }: { unlock: NextTierUnlock }) {
  return (
    <Card>
      <AppText variant="heading">
        Next: Tier {unlock.tier} at {formatMoneyExact(unlock.atCents)} peak net worth
      </AppText>
      <AppText muted>{formatMoneyExact(unlock.remainingCents)} to go</AppText>
    </Card>
  );
}
