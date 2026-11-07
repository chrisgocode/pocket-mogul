import {
  applyActivateBoost,
  applyRecordAdReward,
  boostRemainingMs,
  consumeBoostTime,
  type BoostRules,
} from './boost';
import { freshGameState, type GameState } from './gameState';

const rules: BoostRules = { tapMultiplier: 5, durationMs: 60_000 };

const fresh = (): GameState => freshGameState({ saveId: 'boost', economyVersion: 1, wallMs: 0 });

function recorded(state: GameState, presentationId: string): GameState {
  const result = applyRecordAdReward(state, { presentationId });
  if (!result.ok) throw new Error(result.error);
  return result.state;
}

function activated(state: GameState): GameState {
  const result = applyActivateBoost(state, rules);
  if (!result.ok) throw new Error(result.error);
  return result.state;
}

describe('recording an earned reward', () => {
  it('holds the grant as pending until it is activated', () => {
    const state = recorded(fresh(), 'show-1');
    expect(state.reward).toEqual({
      boost: { status: 'pending', grantId: 'show-1' },
      processedRewardIds: ['show-1'],
    });
  });

  it('ignores a second reward for the same presentation (AC19)', () => {
    const once = activated(recorded(fresh(), 'show-1'));
    const again = applyRecordAdReward(once, { presentationId: 'show-1' });
    expect(again).toMatchObject({ ok: true, state: once });
  });

  it('refuses a new reward while a boost exists', () => {
    const boosted = activated(recorded(fresh(), 'show-1'));
    expect(applyRecordAdReward(boosted, { presentationId: 'show-2' })).toEqual({
      ok: false,
      error: 'BOOST_ACTIVE',
    });
  });
});

describe('activating a boost', () => {
  it('turns a pending grant into one 60-second boost', () => {
    const state = activated(recorded(fresh(), 'show-1'));
    expect(state.reward.boost).toEqual({
      status: 'active',
      grantId: 'show-1',
      remainingMs: 60_000,
    });
  });

  it('does nothing without a pending grant', () => {
    const state = fresh();
    expect(applyActivateBoost(state, rules)).toMatchObject({ ok: true, state });
  });

  it('does not restart a boost that is already running', () => {
    const running = consumeBoostTime(activated(recorded(fresh(), 'show-1')), 20_000);
    expect(activated(running).reward.boost).toMatchObject({ remainingMs: 40_000 });
  });
});

describe('boost time', () => {
  it('counts down by eligible foreground time and ends at zero', () => {
    const boosted = activated(recorded(fresh(), 'show-1'));
    expect(boostRemainingMs(consumeBoostTime(boosted, 59_999).reward.boost)).toBe(1);
    expect(consumeBoostTime(boosted, 60_000).reward.boost).toEqual({ status: 'none' });
    expect(consumeBoostTime(boosted, 90_000).reward.boost).toEqual({ status: 'none' });
  });

  it('leaves a pending grant waiting', () => {
    const pending = recorded(fresh(), 'show-1');
    expect(consumeBoostTime(pending, 90_000)).toBe(pending);
  });

  it('reports no remaining time without an active boost', () => {
    expect(boostRemainingMs({ status: 'none' })).toBe(0);
    expect(boostRemainingMs({ status: 'pending', grantId: 'show-1' })).toBe(0);
  });
});
