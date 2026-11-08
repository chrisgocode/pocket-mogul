import { CURRENT_ECONOMY_VERSION } from '@/content';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { ownedBusiness } from '@/domain/testRules';

import { startTestGameFrom } from './testGame';

const DAY_MS = 600_000;
const LEFT_AT_MS = 1_800_000_000_000;

const regional: GameState = {
  ...freshGameState({
    saveId: 'rivals',
    economyVersion: CURRENT_ECONOMY_VERSION,
    wallMs: LEFT_AT_MS,
  }),
  businesses: [
    ownedBusiness('vending', {
      stage: 3,
      units: 20,
      treasuryCents: dollars('10,000'),
      payoutPercent: 100,
    }),
  ],
};

describe('a takeover offer sent twice (AC40)', () => {
  it('records one offer and merges the rival once', async () => {
    const session = await startTestGameFrom(regional);
    const envelope = {
      id: 'offer-once',
      command: {
        type: 'MakeTakeoverOffer',
        businessId: 'vending',
        rivalId: 'snackpoint',
        amountCents: dollars('5,912'),
      },
    } as const;
    const first = await session.game.dispatch(envelope);
    expect(await session.game.dispatch(envelope)).toEqual(first);
    session.clock.advance(DAY_MS);
    await session.game.dispatch({ id: 'tick', command: { type: 'AdvanceTime' } });
    await session.game.dispatch(envelope);
    expect(session.game.getSnapshot().state.businesses[0]).toMatchObject({
      units: 25,
      treasuryCents: dollars('4,088'),
      takeovers: { offer: { status: 'none' }, merged: ['snackpoint'] },
    });
  });
});
