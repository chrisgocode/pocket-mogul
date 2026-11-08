import { readFileSync } from 'node:fs';

import { currentState } from './testGame';
import { encodeSave } from './saveFormat';

const baseline = readFileSync(new URL('fixtures/save-baseline.json', import.meta.url), 'utf8');

describe('additive listing save fields', () => {
  it('loads the baseline as private without invented progress', () => {
    const state = currentState(baseline);
    expect(state.businesses[0]?.listing).toEqual({ status: 'private' });
    expect(state.shareholderPayouts).toEqual([]);
    expect(currentState(encodeSave(state))).toEqual(state);
  });
});
