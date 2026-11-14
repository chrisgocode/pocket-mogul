import type { RivalView } from '@/application/takeoverView';
import type { Business } from '@/content';
import { formatMoneyExact } from '@/domain/money';
import { AdRewardButton } from '@/features/adRewards/AdRewardButton';
import { ListRow } from '@/ui/ListRow';

import { dayCount } from './businessFormat';
import { OpenRivalRow } from './OpenRivalRow';
import { rivalFacts, wholeChance, type TakeoverChoice } from './takeoverFormat';

function standing(rival: Exclude<RivalView, { status: 'open' }>): string {
  if (rival.status === 'merged') return 'Merged into your business';
  if (rival.status === 'waiting') return 'Wait for your other offer to be answered';
  if (rival.status === 'locked') {
    return `Turned down your offer · Try again in ${dayCount(rival.daysLeft)}`;
  }
  const amount = formatMoneyExact(rival.amountCents);
  return `Your ${amount} offer (${wholeChance(rival.chanceBps)} chance) is answered at the start of the next day. Keep ${amount} in the treasury until then.`;
}

export function RivalRow({
  business,
  rival,
  percent,
  onReview,
}: {
  business: Business;
  rival: RivalView;
  percent: number;
  onReview: (choice: TakeoverChoice) => void;
}) {
  const facts = rivalFacts(business, rival);
  if (rival.status !== 'open') {
    return (
      <>
        <ListRow
          title={rival.name}
          subtitle={`${facts}\n${standing(rival)}`}
          dimmed={rival.status !== 'pending'}
        />
        {rival.status === 'locked' ? (
          <AdRewardButton
            offer={{ kind: 'clear_takeover_lock', businessId: business.id, rivalId: rival.id }}
            name={rival.name}
            reward="offer again now"
          />
        ) : null}
      </>
    );
  }
  const offer = rival.offers.find((each) => each.percent === percent) ?? rival.offers[0];
  if (offer === undefined) return <ListRow title={rival.name} subtitle={facts} />;
  return <OpenRivalRow rival={rival} offer={offer} facts={facts} onReview={onReview} />;
}
