import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Linking } from 'react-native';

import { startAdSession, type AdSession } from '@/application/automaticAdsTesting';
import type { OpenedGame } from '@/application/game';
import type { AutomaticAdSetup } from '@/application/scriptedAds';
import { getContent } from '@/content';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

const AD_BREAK_MS = getContent().economy.ads.adBreakCardMs;

async function openApp(
  initialUrl: string,
  setup: { interstitial?: AutomaticAdSetup; warmUp?: 'played' | 'fresh' } = {},
): Promise<AdSession> {
  const session = await startAdSession(setup);
  mockGame = Promise.resolve({ status: 'ready', game: session.game });
  await renderRouter('src/app', { initialUrl });
  return session;
}

const tab = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) });

describe('natural-break interstitials on screen', () => {
  it('leaving Home shows the Ad break card, then the interstitial', async () => {
    const session = await openApp('/home', { interstitial: { scripts: ['held'] } });
    await fireEvent.press(tab('Businesses'));
    expect(screen.getByText('Ad break')).toBeOnTheScreen();
    expect(session.ads.automatic.interstitial.shows()).toBe(0);
    await act(async () => {
      session.clock.advance(AD_BREAK_MS);
      await Promise.resolve();
    });
    expect(session.ads.automatic.interstitial.shows()).toBe(1);
    expect(screen.queryByText('Ad break')).not.toBeOnTheScreen();
    await act(() => session.ads.automatic.interstitial.emit({ type: 'closed' }));
    expect(session.game.getSnapshot().automaticAd).toBe('none');
  });

  it('closing a confirmation sheet is a natural break', async () => {
    const session = await openApp('/home');
    await fireEvent.press(screen.getByRole('button', { name: /^Upgrade wallet/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Ad break')).toBeOnTheScreen();
    await act(async () => {
      session.clock.advance(AD_BREAK_MS);
      await session.game.flushTaps();
    });
    expect(session.ads.automatic.interstitial.shows()).toBe(1);
  });

  it('the Ad break card ignores input', async () => {
    const session = await openApp('/home', { interstitial: { scripts: ['held'] } });
    await fireEvent.press(tab('Businesses'));
    expect(screen.getByTestId('ad-break-card')).toBeOnTheScreen();
    expect(screen.getByTestId('ad-break-card')).toHaveProp('accessibilityViewIsModal', true);
    expect(session.game.getSnapshot().automaticAd).toBe('adBreak');
  });
});

describe('reporting an ad', () => {
  it('opens a report email from Settings', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await openApp('/settings');
    await fireEvent.press(screen.getByRole('button', { name: 'Report an ad' }));
    expect(openURL).toHaveBeenCalledWith(
      'mailto:ads@pocketfortune.example?subject=Report%20an%20ad%20in%20Pocket%20Fortune',
    );
  });
});
