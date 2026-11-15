import { getContent } from '@/content';
import type { ActivityEntry } from '@/domain/activity';
import { dollars, moneyCents } from '@/domain/money';

import { activityRows } from './activityRows';

const content = getContent();
const ABSENCE_MS = 600_000;

const vandalism = (sequence: number, loss: string): ActivityEntry => ({
  kind: 'incident',
  sequence,
  simulationMs: ABSENCE_MS,
  assetId: 'vending',
  incidentId: 'vending_vandalism',
  treasuryChangeCents: moneyCents(0n - dollars(loss)),
  insured: false,
});

const dividend = (sequence: number): ActivityEntry => ({
  kind: 'dividend',
  sequence,
  simulationMs: ABSENCE_MS,
  cashChangeCents: dollars('5'),
});

describe('Activity rows', () => {
  it('folds incidents from the same moment into one row with the total loss', () => {
    const rows = activityRows(
      [vandalism(4, '280'), vandalism(3, '300'), vandalism(2, '20.50'), dividend(1)],
      content,
    );
    expect(rows.map((row) => [row.key, row.title, row.detail])).toEqual([
      ['4', 'Vending Machine: Vandalism ×3', 'Day 1, 00:10 · Cost $600.50 from its treasury'],
      ['1', 'Dividends paid', 'Day 1, 00:10'],
    ]);
  });

  it('keeps incidents apart when something else happened between them', () => {
    const rows = activityRows([vandalism(3, '280'), dividend(2), vandalism(1, '280')], content);
    expect(rows.map((row) => row.title)).toEqual([
      'Vending Machine: Vandalism',
      'Dividends paid',
      'Vending Machine: Vandalism',
    ]);
  });
});
