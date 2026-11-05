import { getContent, TIERS, type Tier } from '@/content';
import { formatMoneyExact, formatRatePerMinute, moneyCents } from '@/domain/money';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { ListRow } from '@/ui/ListRow';
import { LogoMark } from '@/ui/LogoMark';
import { Screen } from '@/ui/Screen';
import { Section } from '@/ui/Section';

export function BusinessesScreen() {
  const { businesses, economy } = getContent();
  const unlockNote = (tier: Tier) =>
    tier === 1
      ? 'Available now'
      : `Unlocks at ${formatMoneyExact(economy.tierUnlocks[tier])} peak net worth`;

  return (
    <Screen>
      <EmptyState
        title="No businesses yet"
        message="Save up from tapping to buy a Vending Machine, your first business."
      />
      {TIERS.map((tier) => (
        <Section key={tier} title={`Tier ${tier}`} note={unlockNote(tier)}>
          <Card>
            {businesses
              .filter((b) => b.tier === tier)
              .map((b) => (
                <ListRow
                  key={b.id}
                  leading={<LogoMark logo={b.logo} />}
                  title={b.name}
                  subtitle={`Earns ${formatRatePerMinute(moneyCents(b.revenuePerMinute - b.costsPerMinute), 'full')} net`}
                  value={formatMoneyExact(b.price)}
                  dimmed={tier !== 1}
                />
              ))}
          </Card>
        </Section>
      ))}
    </Screen>
  );
}
