import { groupIncidentLines } from './returnSummaryView';

const vandalism = (key: string) => ({
  key,
  title: 'Vending Machine: Vandalism',
  detail: 'Cost $280.00 from its treasury',
});
const breakdown = {
  key: 'vending:2',
  title: 'Vending Machine: Breakdown',
  detail: 'Capacity down 30% for 4 days',
};

describe('Return summary incidents', () => {
  it('folds identical incidents into one line with a count, in first-seen order', () => {
    const lines = groupIncidentLines([
      vandalism('vending:1'),
      breakdown,
      vandalism('vending:3'),
      vandalism('vending:4'),
    ]);
    expect(lines).toEqual([
      {
        key: 'vending:1',
        title: 'Vending Machine: Vandalism ×3',
        detail: 'Cost $280.00 from its treasury',
      },
      breakdown,
    ]);
  });

  it('keeps an incident that happened once as it was', () => {
    expect(groupIncidentLines([breakdown])).toEqual([breakdown]);
  });
});
