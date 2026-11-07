import { freshGameState, type GameState } from '@/domain/gameState';

import { decodeSave, encodeSave } from './saveFormat';
import { currentState, migratedState } from './testGame';

function saveBeforeRewards(schemaVersion: number): string {
  const { reward: _reward, ...older } = {
    ...freshGameState({ saveId: 'before-ads', economyVersion: 1, wallMs: 0 }),
    schemaVersion,
  };
  return encodeSave(older as GameState);
}

describe('saves from before the Tap Boost', () => {
  it.each([4, 5])('migrate from schema %p with no grant, boost or processed rewards', (version) => {
    const state = migratedState(saveBeforeRewards(version));
    expect(state.schemaVersion).toBe(6);
    expect(state.reward).toEqual({ boost: { status: 'none' }, processedRewardIds: [] });
  });

  it('keep the goals and activity of a schema 5 save', () => {
    const state = migratedState(saveBeforeRewards(5));
    expect(state.goals).toEqual({ completed: [], pinnedGoalId: null });
    expect(state.activity.lifetime.entries).toBe(0);
  });
});

describe('the reward state in a save', () => {
  it('round-trips an active boost and its processed reward IDs', () => {
    const boosted: GameState = {
      ...freshGameState({ saveId: 'boosted', economyVersion: 1, wallMs: 0 }),
      reward: {
        boost: { status: 'active', grantId: 'show-2', remainingMs: 41_250 },
        processedRewardIds: ['show-1', 'show-2'],
      },
    };
    expect(currentState(encodeSave(boosted)).reward).toEqual(boosted.reward);
  });

  it('round-trips a pending grant', () => {
    const pending: GameState = {
      ...freshGameState({ saveId: 'pending', economyVersion: 1, wallMs: 0 }),
      reward: { boost: { status: 'pending', grantId: 'show-1' }, processedRewardIds: ['show-1'] },
    };
    expect(currentState(encodeSave(pending)).reward).toEqual(pending.reward);
  });

  it('rejects a boost with negative time as damaged', () => {
    const damaged = encodeSave({
      ...freshGameState({ saveId: 'damaged', economyVersion: 1, wallMs: 0 }),
      reward: {
        boost: { status: 'active', grantId: 'show-1', remainingMs: -5 },
        processedRewardIds: [],
      },
    });
    expect(decodeSave(damaged)).toEqual({ status: 'corrupt' });
  });
});
