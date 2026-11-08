import { CURRENT_ECONOMY_VERSION, getContent } from '@/content';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';

import { engineStep } from './engineStep';

const boosted: GameState = {
  ...freshGameState({
    saveId: 'balance-boost',
    economyVersion: CURRENT_ECONOMY_VERSION,
    wallMs: 0,
  }),
  reward: {
    boost: { status: 'active', grantId: 'grant', remainingMs: 1_500 },
    processedRewardIds: ['grant'],
  },
};

describe('the balance engine step', () => {
  it('spends boost time with active play, like the app', () => {
    const step = engineStep(boosted, {
      command: { type: 'AdvanceTime' },
      content: getContent(),
      elapsedMs: 1_000,
    });
    expect(step.state?.reward.boost).toMatchObject({ remainingMs: 500 });
  });

  it('pays boosted taps while the boost lasts', () => {
    const step = engineStep(boosted, {
      command: { type: 'TapBatch', taps: 2, boosted: true },
      content: getContent(),
      elapsedMs: 1_000,
    });
    expect<bigint | undefined>(step.state?.cashCents).toBe(dollars('10'));
  });
});
