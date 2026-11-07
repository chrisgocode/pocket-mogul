import { boostTime } from './boostTime';
import { startTestGame } from './testGame';

describe('the boost clock', () => {
  it('stays paused until every cover is lifted', async () => {
    const { clock } = await startTestGame();
    const time = boostTime(clock);
    clock.advance(1_000);
    time.cover('background');
    time.cover('fullScreenAd');
    clock.advance(5_000);
    time.uncover('background');
    clock.advance(5_000);
    time.uncover('fullScreenAd');
    clock.advance(2_000);
    expect(time.unsavedMs()).toBe(3_000);
  });
});
