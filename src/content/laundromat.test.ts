import { economyV2 } from './economy-v2';
import { findContentIssues, getContent } from './index';
import type { ContentInput } from './schema';

type LaundromatInput = Extract<
  NonNullable<ContentInput['businesses'][number]['mechanic']>,
  { kind: 'laundromat' }
>;

function laundromatOf(content: ContentInput): LaundromatInput {
  const mechanic = content.businesses.find((business) => business.id === 'laundromat')?.mechanic;
  if (mechanic?.kind !== 'laundromat') throw new Error('The Laundromat has no mechanic');
  return mechanic;
}

const issuesFor = (mutate: (laundromat: LaundromatInput) => void) => {
  const content: ContentInput = structuredClone(economyV2);
  mutate(laundromatOf(content));
  return findContentIssues(content);
};

describe('the Laundromat mechanic in content (BUS20f)', () => {
  it('gives only the Laundromat a machine mix and service washes, unlocked at Local', () => {
    const laundromats = getContent().businesses.filter(
      (business) => business.mechanic?.kind === 'laundromat',
    );
    expect(laundromats.map((business) => business.id)).toEqual(['laundromat']);
    expect(laundromatOf(economyV2)).toMatchObject({
      unlockStage: 2,
      jumbo: { sharePercents: [0, 20, 40, 60] },
      pickup: { stage: 5, demandPercent: 25 },
    });
  });

  it('keeps the earlier mechanics and passes validation as bundled', () => {
    const kinds = getContent().businesses.map((business) => business.mechanic?.kind);
    expect(kinds.slice(0, 4)).toEqual(['vending', 'food_cart', 'coffee_kiosk', 'laundromat']);
    expect(findContentIssues(economyV2)).toEqual([]);
  });

  it('rejects jumbo shares and service prices in the wrong order', () => {
    expect(
      issuesFor((laundromat) => {
        laundromat.jumbo.sharePercents = [20, 0, 40];
        laundromat.service.priceBpsByLevel = [12_000, 15_000];
      }),
    ).toEqual([
      'Business laundromat jumbo shares must start at none and rise',
      'Business laundromat each service level must sell for less than the one before',
    ]);
  });

  it('rejects service washes that take every machine and stages that do not fit', () => {
    expect(
      issuesFor((laundromat) => {
        laundromat.service.loadsPercentPerLevel = 40;
        laundromat.unlockStage = 6;
        laundromat.pickup.stage = 1;
      }),
    ).toEqual([
      'Business laundromat service washes must leave machines for walk-ins',
      'Business laundromat mechanic must unlock at a stage that exists',
      'Business laundromat pickup must unlock at a stage after the mechanic',
    ]);
  });
});
