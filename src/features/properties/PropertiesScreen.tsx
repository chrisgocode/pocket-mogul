import { getContent } from '@/content';
import { formatMoneyExact, formatRatePerMinute, moneyCents } from '@/domain/money';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { ListRow } from '@/ui/ListRow';
import { LogoMark } from '@/ui/LogoMark';
import { Screen } from '@/ui/Screen';
import { Section } from '@/ui/Section';

export function PropertiesScreen() {
  const { properties } = getContent();
  return (
    <Screen>
      <EmptyState
        title="No properties yet"
        message="Buy a listing when you can afford it, then rent it out for income."
      />
      <Section title="Listings">
        <Card>
          {properties.map((p) => (
            <ListRow
              key={p.id}
              leading={<LogoMark logo={p.logo} />}
              title={p.name}
              subtitle={`Rents for ${formatRatePerMinute(moneyCents(p.rentPerMinute - p.upkeepPerMinute), 'full')} net`}
              value={formatMoneyExact(p.price)}
            />
          ))}
        </Card>
      </Section>
    </Screen>
  );
}
