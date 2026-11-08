import { economyV1 } from './economy-v1';
import { findContentIssues, getContent } from './index';
import type { ContentInput } from './schema';

type DeliveryInput = Extract<
  NonNullable<ContentInput['businesses'][number]['mechanic']>,
  { kind: 'delivery' }
>;

function deliveryOf(content: ContentInput): DeliveryInput {
  const mechanic = content.businesses.find((business) => business.id === 'delivery')?.mechanic;
  if (mechanic?.kind !== 'delivery') throw new Error('The Delivery Company has no mechanic');
  return mechanic;
}

const issuesFor = (mutate: (delivery: DeliveryInput) => void) => {
  const content: ContentInput = structuredClone(economyV1);
  mutate(deliveryOf(content));
  return findContentIssues(content);
};

describe('the Delivery Company mechanic in content (BUS20c)', () => {
  it('gives only the Delivery Company contracts, unlocked at Local', () => {
    const flagships = getContent().businesses.filter(
      (business) => business.mechanic?.kind === 'delivery',
    );
    expect(flagships.map((business) => business.id)).toEqual(['delivery']);
    expect(deliveryOf(economyV1)).toMatchObject({
      unlockStage: 2,
      vansPerDriver: 2,
      offers: { boardSize: 3, expiryDays: 2 },
      reputation: { windowDays: 10 },
      sortingHub: { stage: 5, capacityPercent: 30 },
    });
  });

  it('rejects backwards ranges, doubled clients and star rules out of order', () => {
    expect(
      issuesFor((delivery) => {
        delivery.offers.days = { min: 6, max: 2 };
        delivery.offers.clients.push({ id: 'brightcart', name: 'Brightcart Again' });
        delivery.reputation.stars.reverse();
      }),
    ).toEqual([
      'Business delivery offer ranges must not run backwards',
      'Business delivery client IDs must be unique',
      'Business delivery one star must need no on-time share',
      'Business delivery star thresholds must rise and stay within 100%',
    ]);
  });

  it('rejects too few drivers for the vans and a sorting hub before the mechanic', () => {
    expect(
      issuesFor((delivery) => {
        delivery.vansPerDriver = 1;
        delivery.sortingHub.stage = 1;
      }),
    ).toEqual([
      'Business delivery the sorting hub must unlock at a stage after the mechanic',
      'Business delivery drivers allowed at each stage must be able to drive every van',
    ]);
  });
});
