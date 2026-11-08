import { CURRENT_ECONOMY_VERSION } from '@/content';
import { freshGameState, type GameState } from '@/domain/gameState';

import { decodeSave, encodeSave } from './saveFormat';
import { currentState } from './testGame';

describe('the reward state in a save', () => {
  it('round-trips an active boost and its processed reward IDs', () => {
    const boosted: GameState = {
      ...freshGameState({ saveId: 'boosted', economyVersion: CURRENT_ECONOMY_VERSION, wallMs: 0 }),
      reward: {
        boost: { status: 'active', grantId: 'show-2', remainingMs: 41_250 },
        processedRewardIds: ['show-1', 'show-2'],
      },
    };
    expect(currentState(encodeSave(boosted)).reward).toEqual(boosted.reward);
  });

  it('round-trips a pending grant', () => {
    const pending: GameState = {
      ...freshGameState({ saveId: 'pending', economyVersion: CURRENT_ECONOMY_VERSION, wallMs: 0 }),
      reward: { boost: { status: 'pending', grantId: 'show-1' }, processedRewardIds: ['show-1'] },
    };
    expect(currentState(encodeSave(pending)).reward).toEqual(pending.reward);
  });

  it('rejects a boost with negative time as damaged', () => {
    const damaged = encodeSave({
      ...freshGameState({ saveId: 'damaged', economyVersion: CURRENT_ECONOMY_VERSION, wallMs: 0 }),
      reward: {
        boost: { status: 'active', grantId: 'show-1', remainingMs: -5 },
        processedRewardIds: [],
      },
    });
    expect(decodeSave(damaged)).toEqual({ status: 'corrupt' });
  });
});
