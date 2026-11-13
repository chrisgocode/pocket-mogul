import { economyV1 } from './economy-v1';
import { economyV2 } from './economy-v2';
import { businessDefinition, findContentIssues, getContent, validateContent } from './index';
import type { ContentInput } from './schema';

type Synergies = NonNullable<ContentInput['synergies']>;

const issuesFor = (mutate: (synergies: Synergies) => void) => {
  const content: ContentInput & { synergies: Synergies } = structuredClone(economyV2);
  mutate(content.synergies);
  return findContentIssues(content);
};

describe('business synergies in content (BUS21)', () => {
  it('gives every business at least one synergy inside the cap', () => {
    const content = getContent();
    const totals = content.businesses.map((business) =>
      businessDefinition(business, content).synergies.reduce(
        (total, synergy) => total + synergy.percent,
        0,
      ),
    );
    expect(content.synergies.capPercent).toBe(20);
    expect(totals).toEqual([8, 6, 8, 11, 8, 10, 12, 10, 15, 14, 6, 6]);
  });

  it('pairs the Bakery with the Coffee Kiosk in both directions', () => {
    const links = getContent().synergies.links.filter((link) =>
      [link.businessId, link.partnerId].every((id) => ['bakery', 'coffee_kiosk'].includes(id)),
    );
    expect(links.map((link) => [link.businessId, link.effect, link.percent])).toEqual([
      ['coffee_kiosk', 'cost', 8],
      ['bakery', 'demand', 6],
    ]);
  });

  it('leaves economy 1 without synergies', () => {
    expect(validateContent(economyV1).synergies.links).toEqual([]);
  });

  it('rejects links that do not fit', () => {
    expect(
      issuesFor((synergies) => {
        synergies.capPercent = 9;
      }),
    ).toContain('Business hotel_group synergies pass the cap');
    expect(
      issuesFor((synergies) => {
        synergies.links[0]!.partnerId = 'casino';
      }),
    ).toEqual(['Synergy laundromat_hosts_vending needs an unknown partner']);
    expect(
      issuesFor((synergies) => {
        synergies.links.shift();
      }),
    ).toEqual(['Business vending needs at least one synergy']);
    expect(
      issuesFor((synergies) => {
        synergies.links[1]!.businessId = 'vending';
        synergies.links[1]!.partnerId = 'laundromat';
      }),
    ).toContain('Only one synergy may link vending with laundromat');
  });
});
