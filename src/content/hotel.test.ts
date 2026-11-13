import { economyV2 } from './economy-v2';
import { findContentIssues, getContent } from './index';
import type { ContentInput } from './schema';

type HotelInput = Extract<
  NonNullable<ContentInput['businesses'][number]['mechanic']>,
  { kind: 'hotel' }
>;

function hotelOf(content: ContentInput): HotelInput {
  const mechanic = content.businesses.find((business) => business.id === 'hotel_group')?.mechanic;
  if (mechanic?.kind !== 'hotel') throw new Error('The Hotel Group has no mechanic');
  return mechanic;
}

const issuesFor = (mutate: (hotel: HotelInput) => void) => {
  const content: ContentInput = structuredClone(economyV2);
  mutate(hotelOf(content));
  return findContentIssues(content);
};

describe('the Hotel Group mechanic in content (BUS20i)', () => {
  it('gives only the Hotel Group seasons and stars, unlocked at Local', () => {
    const hotels = getContent().businesses.filter(
      (business) => business.mechanic?.kind === 'hotel',
    );
    expect(hotels.map((business) => business.id)).toEqual(['hotel_group']);
    expect(hotelOf(economyV2)).toMatchObject({
      unlockStage: 2,
      seasonDays: 3,
      stars: { max: 5 },
      conference: { stage: 5, eventDemandPercent: 50 },
    });
  });

  it('stays on economy 2 and passes validation as bundled', () => {
    expect(getContent().economyVersion).toBe(2);
    expect(findContentIssues(economyV2)).toEqual([]);
  });

  it('rejects season chances that do not add up and seasons out of order', () => {
    expect(
      issuesFor((hotel) => {
        hotel.seasonChanceBps.event = 2000;
        hotel.seasonDemandBps.low = 14_000;
      }),
    ).toEqual([
      'Business hotel_group season chances must add up to 100%',
      'Business hotel_group seasons must draw more guests from Low to Event',
    ]);
  });

  it('rejects a mechanic or conference centre at a stage that does not fit', () => {
    expect(
      issuesFor((hotel) => {
        hotel.unlockStage = 6;
        hotel.conference.stage = 1;
      }),
    ).toEqual([
      'Business hotel_group mechanic must unlock at a stage that exists',
      'Business hotel_group conference centre must unlock at a stage after the mechanic',
    ]);
  });
});
