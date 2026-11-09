import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';

import type { OpenedGame } from '@/application/game';
import { scriptedAds } from '@/application/scriptedAds';
import { startObservedTestGame, type TestGame } from '@/application/testGame';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

async function openHome(ads = scriptedAds()): Promise<TestGame> {
  const session = await startObservedTestGame({ ads });
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl: '/home' });
  return session;
}

const boostButton = (label: string) =>
  within(screen.getByLabelText('Tap earnings')).getByRole('button', {
    name: `Tap Boost, ${label}`,
  });
const tapCard = () => screen.getByRole('button', { name: /^Tap card/ });

async function watchAd(session: TestGame) {
  await fireEvent.press(boostButton('Watch ad · 5x for 60s'));
  await act(() => session.game.flushTaps());
}

describe('Home Tap Boost button', () => {
  it('states the reward before the player chooses to watch', async () => {
    await openHome();
    expect(screen.getByText('Watch an ad to earn 5x per tap for 60 seconds.')).toBeOnTheScreen();
    expect(boostButton('Watch ad · 5x for 60s')).toBeEnabled();
    expect(
      within(screen.getByLabelText('Tap earnings')).getByRole('button', { name: /^Tap card/ }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: /purchase|restore|checkout|subscribe/i }),
    ).toBeNull();
  });

  it('starts a boost after the ad, shows the timer and pays 5x per tap', async () => {
    const session = await openHome();
    await watchAd(session);
    expect(screen.getByText('5x boost · 1:00 left')).toBeOnTheScreen();
    expect(boostButton('Boost running')).toBeDisabled();
    await fireEvent.press(tapCard());
    expect(screen.getByLabelText('Cash $5.00')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /per tap, boosted$/ })).toBeOnTheScreen();
    await act(() => {
      session.clock.advance(15_000);
    });
    expect(screen.getByText('5x boost · 0:45 left')).toBeOnTheScreen();
  });

  it('is disabled while an ad is showing', async () => {
    const session = await openHome(scriptedAds({ scripts: ['held'] }));
    await watchAd(session);
    expect(boostButton('Ad playing…')).toBeDisabled();
  });

  it('is disabled while an earned grant waits to start', async () => {
    const session = await openHome(scriptedAds({ scripts: ['held'] }));
    await watchAd(session);
    await act(async () => {
      session.ads.emit({ type: 'earnedReward' });
      await session.game.flushTaps();
    });
    expect(boostButton('Starting boost…')).toBeDisabled();
  });

  it('grants nothing when the ad closes early', async () => {
    const session = await openHome(scriptedAds({ scripts: ['closeWithoutReward'] }));
    await watchAd(session);
    expect(boostButton('Watch ad · 5x for 60s')).toBeEnabled();
    await fireEvent.press(tapCard());
    expect(screen.getByLabelText('Cash $1.00')).toBeOnTheScreen();
  });

  it('shows when no ad is available and keeps tapping working', async () => {
    const ads = scriptedAds({ fill: 'noFill' });
    await openHome(ads);
    expect(
      screen.getByText('No ad is available right now. Tapping still works.'),
    ).toBeOnTheScreen();
    await fireEvent.press(tapCard());
    expect(screen.getByLabelText('Cash $1.00')).toBeOnTheScreen();
    ads.fill('fill');
    await fireEvent.press(boostButton('Try again'));
    expect(boostButton('Watch ad · 5x for 60s')).toBeEnabled();
  });
});
