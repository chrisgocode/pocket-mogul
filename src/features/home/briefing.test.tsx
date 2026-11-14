import { CURRENT_ECONOMY_VERSION } from '@/content';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { startTestGameFrom, type TestGame } from '@/application/testGame';
import type { BriefingTask } from '@/domain/briefing';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

let session: TestGame;

const FRESH = freshGameState({
  saveId: 'briefing-card',
  economyVersion: CURRENT_ECONOMY_VERSION,
  wallMs: 0,
});

const task = (change: Partial<BriefingTask>): BriefingTask => ({
  templateId: 'brief_taps_200',
  measure: 'taps',
  target: 200,
  progress: 200,
  rewardCents: dollars('10'),
  claim: 'unclaimed',
  ...change,
});

const start = async (overrides: Partial<GameState> = {}) => {
  session = await startTestGameFrom({ ...FRESH, ...overrides });
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl: '/home' });
};

const briefingOf = (tasks: readonly BriefingTask[]): Pick<GameState, 'briefing'> => ({
  briefing: {
    status: 'active',
    dayKey: 'day-0',
    tasks,
    bonusCents: dollars('25'),
    bonus: 'unclaimed',
  },
});

describe('Daily briefing card on Earn (UX03c)', () => {
  it('appears with three tasks once the player starts playing', async () => {
    await start();
    expect(screen.queryByText('Daily briefing')).toBeNull();
    await act(() => session.game.checkpoint());
    expect(await screen.findByText('Daily briefing')).toBeOnTheScreen();
    expect(screen.getByLabelText(/^Daily briefing · 0 of 3 done, /)).toBeOnTheScreen();
    expect(screen.getByText('0 of 3 done')).toBeOnTheScreen();
    expect(
      screen.getByText('Finish all 3 for a $25.00 bonus. New tasks every day.'),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /daily briefing$/ })).toBeNull();
  });

  it('shows progress and claims the reward for a finished task', async () => {
    const trade = task({ templateId: 'brief_trades_1', measure: 'trades', target: 1, progress: 0 });
    await start(briefingOf([task({}), trade]));
    expect(
      screen.getByLabelText('Tap 200 times, 200 of 200, done, reward ready, $10.00'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Make a trade, 0 of 1, in progress, $10.00')).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Claim $10.00 from the daily briefing' }),
    );
    expect(await screen.findByText('Claimed')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /daily briefing$/ })).toBeNull();
    expect(session.game.getSnapshot().state.cashCents).toBe(dollars('10'));
  });

  it('keeps the next task in view at the top of Earn and claims from there', async () => {
    const trade = task({ templateId: 'brief_trades_1', measure: 'trades', target: 1, progress: 0 });
    await start(briefingOf([task({}), trade]));
    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Daily briefing · 1 of 2 done, Make a trade · 0 of 1, claim $10.00',
      }),
    );
    expect(await screen.findByText('Claimed')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Daily briefing · 1 of 2 done, Make a trade · 0 of 1'),
    ).toBeOnTheScreen();
    expect(session.game.getSnapshot().state.cashCents).toBe(dollars('10'));
  });

  it('pays the bonus with the last task', async () => {
    await start(briefingOf([task({})]));
    expect(screen.getByText('All done. $25.00 bonus ready.')).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Claim $35.00 from the daily briefing' }),
    );
    expect(
      await screen.findByText('All done. $25.00 bonus claimed. New tasks tomorrow.'),
    ).toBeOnTheScreen();
    expect(session.game.getSnapshot().state.cashCents).toBe(dollars('35'));
  });
});
