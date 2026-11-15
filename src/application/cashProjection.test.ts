import { getContent } from '@/content';
import { freshGameState } from '@/domain/gameState';
import { moneyCents } from '@/domain/money';

import { selectCashCents, stateWithUnsavedIncome } from './cashView';
import { openingSnapshot } from './gameSnapshots';
import { advanceTaxTime } from './taxTime';

const content = getContent();
const state = freshGameState({ saveId: 'projection', economyVersion: 2, wallMs: 0 });
const snapshot = {
  ...openingSnapshot({ state, notice: { kind: 'none' } }),
  unsavedElapsedMs: 1_000,
};

function projected(next: typeof snapshot, rules = content) {
  return advanceTaxTime(next.state, {
    elapsedMs: next.unsavedElapsedMs,
    wallMs: next.state.clock.lastWallCheckpointMs,
    content: rules,
  }).state;
}

describe('shared cash projection', () => {
  it('shares settlement between readers and pending tap publications', () => {
    const first = stateWithUnsavedIncome(snapshot, content);
    const tapped = { ...snapshot, pendingTaps: 2 };
    expect(stateWithUnsavedIncome(tapped, content)).toBe(first);
    expect(selectCashCents(tapped, content) - selectCashCents(snapshot, content)).toBe(200n);
    expect(first).toEqual(projected(snapshot));
  });

  it('recalculates when unsaved time advances or returns to zero', () => {
    const first = stateWithUnsavedIncome(snapshot, content);
    const later = { ...snapshot, unsavedElapsedMs: 2_000 };
    const committed = { ...snapshot, unsavedElapsedMs: 0 };
    expect(stateWithUnsavedIncome(later, content)).not.toBe(first);
    expect(stateWithUnsavedIncome(later, content)).toEqual(projected(later));
    expect(stateWithUnsavedIncome(committed, content)).toEqual(projected(committed));
  });

  it('isolates different committed saves and different content objects', () => {
    const first = stateWithUnsavedIncome(snapshot, content);
    const changed = { ...snapshot, state: { ...state, cashCents: moneyCents(123) } };
    const otherContent = { ...content, economy: { ...content.economy, taxes: undefined } };
    expect(stateWithUnsavedIncome(changed, content)).toEqual(projected(changed));
    expect(stateWithUnsavedIncome(snapshot, otherContent)).not.toBe(first);
    expect(stateWithUnsavedIncome(snapshot, otherContent)).toEqual(
      projected(snapshot, otherContent),
    );
  });
});
