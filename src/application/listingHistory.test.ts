import { getContent } from '@/content';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { ownedBusiness } from '@/domain/testRules';

import { startTestGameFrom, withoutIncidents } from './testGame';

const initial = {
  ...freshGameState({ saveId: 'quote-history', economyVersion: 1, wallMs: 1_800_000_000_000 }),
  businesses: [
    ownedBusiness('coffee_kiosk', { stage: 4, payoutPercent: 0, treasuryCents: dollars('1000') }),
  ],
};

async function listedSession() {
  const session = await startTestGameFrom(initial, { content: withoutIncidents(getContent()) });
  await session.game.dispatch({
    id: 'ipo',
    command: {
      type: 'GoPublic',
      businessId: 'coffee_kiosk',
      floatPercent: 20,
      ticker: 'BEAN',
    },
  });
  return session;
}

describe('seeded listing history', () => {
  it('quotes the valuation at each crossed tick regardless of checkpoint frequency', async () => {
    const batch = await listedSession();
    const stepped = await listedSession();
    batch.clock.advance(600_000);
    await batch.game.dispatch({ id: 'batch', command: { type: 'AdvanceTime' } });
    await Array.from({ length: 10 }, (_, index) => index + 1).reduce(async (previous, tick) => {
      await previous;
      stepped.clock.advance(60_000);
      await stepped.game.dispatch({ id: `tick-${tick}`, command: { type: 'AdvanceTime' } });
    }, Promise.resolve());
    expect(batch.game.getSnapshot().state.market).toEqual(stepped.game.getSnapshot().state.market);
  });
});
