import type { SettingsChange } from '@/domain/settings';

import { startTestGame } from './testGame';

const update = (id: string, change: SettingsChange) =>
  ({ id, command: { type: 'UpdateSettings', change } }) as const;

describe('settings', () => {
  it('start with sound and haptics on, motion following the system and compact numbers', async () => {
    const { game } = await startTestGame();
    expect(game.getSnapshot().state.settings).toEqual({
      sound: 'on',
      haptics: 'on',
      reducedMotion: 'system',
      numberFormatting: 'compact',
    });
  });

  it('save a change and keep it across a restart', async () => {
    const first = await startTestGame();
    await first.game.dispatch(update('haptics-off', { haptics: 'off' }));
    await first.game.dispatch(update('motion', { reducedMotion: 'on' }));
    const { game } = await first.restart();
    expect(game.getSnapshot().state.settings).toEqual({
      sound: 'on',
      haptics: 'off',
      reducedMotion: 'on',
      numberFormatting: 'compact',
    });
  });

  it('leave cash alone', async () => {
    const { game } = await startTestGame();
    await game.dispatch({ id: 'taps', command: { type: 'TapBatch', taps: 3 } });
    const outcome = await game.dispatch(update('full', { numberFormatting: 'full' }));
    expect(outcome).toMatchObject({ ok: true, cashChangeCents: 0n });
  });
});
