import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import { formatMoneyExact } from '@/domain/money';
import { Card } from '@/ui/Card';
import { ChoiceRow } from '@/ui/ChoiceRow';
import { Section } from '@/ui/Section';
import { useSegment } from '@/ui/state/useSegment';

import type { BusinessAction } from './businessAction';
import { LockedDealsCard } from './LockedDealsCard';
import { RivalRow } from './RivalRow';

const OFFER_NOTE =
  'Rivals answer at the start of the next day. The more you offer against their worth, the likelier a yes; a no locks that rival for a few days.';

export function DealsSection({
  detail,
  onReview,
}: {
  detail: OwnedBusinessDetail;
  onReview: (action: BusinessAction) => void;
}) {
  const { deals, business } = detail;
  const percents = deals.status === 'open' ? deals.offerPercents : [];
  const surest = String(percents[percents.length - 1] ?? '');
  const offerSize = useSegment(surest);
  if (deals.status === 'locked') return <LockedDealsCard unlockStage={deals.unlockStage} />;
  const chosen = percents.map(String).includes(offerSize.selected) ? offerSize.selected : surest;
  const worth = `Your business is worth ${formatMoneyExact(deals.valuationCents)}`;
  return (
    <Section title="Deals" note={worth}>
      <Card>
        <ChoiceRow
          title="Offer size"
          note={OFFER_NOTE}
          choices={percents.map((percent) => ({ value: String(percent), label: `${percent}%` }))}
          selected={chosen}
          onSelect={offerSize.select}
        />
      </Card>
      <Card>
        {deals.rivals.map((rival) => (
          <RivalRow
            key={rival.id}
            business={business}
            rival={rival}
            percent={Number(chosen)}
            onReview={(choice) => onReview({ kind: 'takeover', business, choice })}
          />
        ))}
      </Card>
    </Section>
  );
}
