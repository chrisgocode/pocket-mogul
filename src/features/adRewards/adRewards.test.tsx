import { CURRENT_ECONOMY_VERSION, getContent } from '@/content';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { scriptedAds } from '@/application/scriptedAds';
import { startTestGameFrom, withoutIncidents, type TestGame } from '@/application/testGame';
import type { OwnedBusiness } from '@/domain/business/owned';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { ownedBusiness } from '@/domain/testRules';

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

const HOUR_MS = 3_600_000;
const calm = { content: withoutIncidents(getContent()) };

const owner = (change: Partial<OwnedBusiness> = {}): GameState => ({
  ...freshGameState({
    saveId: 'ad-reward-screens',
    economyVersion: CURRENT_ECONOMY_VERSION,
    wallMs: 0,
  }),
  tutorial: { completedSteps: ['tap', 'upgradeWallet', 'buyBusiness'], explanations: 'skipped' },
  businesses: [ownedBusiness('vending', change)],
});

async function open(session: TestGame, initialUrl: string): Promise<TestGame> {
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl });
  return session;
}

const DOUBLE = 'Double offline earnings, Watch ad · double to $4,800.00';
const BRIEFCASE = 'Daily briefcase, Watch ad · $75.00 briefcase';
const RUSH = 'Rush day, Watch ad · 2× profit through the next business day';

const END_INCIDENT = /, Watch ad · end this incident now$/;

describe('rewarded ads (#160, #165)', () => {
  it('doubles offline earnings from the return summary', async () => {
    const left = await startTestGameFrom(owner(), calm);
    const back = await open(await left.restart({ awayMs: 10 * HOUR_MS }), '/home');
    await fireEvent.press(screen.getByRole('button', { name: DOUBLE }));
    expect(await screen.findByLabelText('Doubled by ad, +$2,400.00')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: DOUBLE })).toBeNull();
    expect(back.game.getSnapshot().state.cashCents).toBe(dollars('4800'));
  });

  it('says when no ad is available and grants nothing', async () => {
    const left = await startTestGameFrom(owner(), calm);
    const ads = scriptedAds({ fill: 'noFill' });
    const back = await open(await left.restart({ awayMs: 10 * HOUR_MS, ads }), '/home');
    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Double offline earnings, No ad available · Try again',
      }),
    );
    expect(back.game.getSnapshot().state.cashCents).toBe(dollars('2400'));
  });

  it('pays the daily briefcase once from Earn', async () => {
    const session = await open(await startTestGameFrom(owner(), calm), '/home');
    expect(screen.getByText('15 minutes of your income · 1 of 1 left today')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: BRIEFCASE }));
    expect(
      await screen.findByRole('button', { name: 'Daily briefcase, Back tomorrow' }),
    ).toBeDisabled();
    expect(session.game.getSnapshot().state.cashCents).toBe(dollars('75'));
  });

  it('starts a rush day from the business page', async () => {
    await open(await startTestGameFrom(owner(), calm), '/businesses/vending');
    expect(screen.getByText('3 of 3 left today')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: RUSH }));
    expect(await screen.findByText('Rush day running')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: RUSH })).toBeNull();
  });

  it('ends an active incident from the business page', async () => {
    const incident = {
      status: 'active',
      incidentId: 'vending_breakdown',
      endsDay: 5,
      capacityBps: 7000,
      costBps: 10000,
    } as const;
    const session = await open(
      await startTestGameFrom(owner({ incident }), calm),
      '/businesses/vending',
    );
    await fireEvent.press(screen.getByRole('button', { name: END_INCIDENT }));
    await session.game.flushTaps();
    expect(session.game.getSnapshot().state.businesses[0]?.incident).toEqual({ status: 'none' });
    expect(screen.queryByRole('button', { name: END_INCIDENT })).toBeNull();
  });
});
