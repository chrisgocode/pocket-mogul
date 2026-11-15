import { getContent } from '@/content';
import { dollars } from '@/domain/money';

import { incidentLines } from './returnSummaryIncidents';

const content = getContent();

const strike = (incidentId: string, at: { atMs: number; loss: string }) => ({
  atMs: at.atMs,
  businessId: 'vending',
  incidentId,
  treasuryLossCents: dollars(at.loss),
  insured: false,
});

describe('Return summary incidents', () => {
  it('folds repeats of one incident into a line with a count and the total loss', () => {
    const lines = incidentLines(content, [
      strike('vending_vandalism', { atMs: 1, loss: '280' }),
      strike('vending_breakdown', { atMs: 2, loss: '0' }),
      strike('vending_vandalism', { atMs: 3, loss: '300' }),
      strike('vending_vandalism', { atMs: 4, loss: '20.50' }),
    ]);
    expect(lines).toEqual([
      {
        key: 'vending:1',
        title: 'Vending Machine: Vandalism ×3',
        detail: 'Cost $600.50 from its treasury',
      },
      {
        key: 'vending:2',
        title: 'Vending Machine: Breakdown',
        detail: 'Capacity down 30% for 4 days',
      },
    ]);
  });

  it('keeps insured and uninsured strikes apart', () => {
    const insured = { ...strike('vending_breakdown', { atMs: 5, loss: '0' }), insured: true };
    const lines = incidentLines(content, [
      strike('vending_breakdown', { atMs: 4, loss: '0' }),
      insured,
    ]);
    expect(lines.map((line) => line.title)).toEqual([
      'Vending Machine: Breakdown',
      'Vending Machine: Breakdown',
    ]);
  });
});
