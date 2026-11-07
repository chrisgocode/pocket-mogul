import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { Linking, Pressable, Text } from 'react-native';

import { startAdSession, type AdSession } from '@/application/automaticAdsTesting';
import type { OpenedGame } from '@/application/game';
import type { AutomaticAdSetup } from '@/application/scriptedAds';
import { getContent } from '@/content';
import { freshGameState } from '@/domain/gameState';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

let mockGame: Promise<OpenedGame>;
jest.mock('@/bootstrap/deviceGame', () => ({ loadDeviceGame: () => mockGame }));

function MockBanner({ onLoaded, onClicked }: { onLoaded: () => void; onClicked: () => void }) {
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Load test banner"
        onPress={onLoaded}
      >
        <Text>Test banner</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tap test banner"
        onPress={onClicked}
      >
        <Text>Open ad</Text>
      </Pressable>
    </>
  );
}

jest.mock('@/bootstrap/deviceBanner', () => ({
  get DeviceBanner() {
    return MockBanner;
  },
}));

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

describe('banners', () => {
  it.each(['businesses', 'markets', 'properties', 'portfolio'])('show on %s', async (name) => {
    await openApp(`/${name}`);
    expect(screen.getByTestId(`ad-banner-${name}`)).toBeOnTheScreen();
    expect(screen.getByText('Test banner')).toBeOnTheScreen();
  });

  it('never show on Home', async () => {
    await openApp('/home');
    expect(screen.queryByText('Test banner')).not.toBeOnTheScreen();
  });

  it('sit below the screen content, clear of the buy buttons and above the tab bar', async () => {
    await openApp('/businesses');
    const banner = screen.getByTestId('ad-banner-businesses');
    expect(within(banner).queryByRole('button', { name: /^Buy / })).not.toBeOnTheScreen();
    expect(within(banner).queryByRole('button', { name: /^Home/ })).not.toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: /^Buy / }).length).toBeGreaterThan(0);
    expect(banner).toHaveStyle({ paddingVertical: 8 });
  });

  it('wait for the tutorial and 5 minutes of play', async () => {
    const session = await startAdSession({
      state: freshGameState({ saveId: 'new', economyVersion: 1, wallMs: 1_800_000_000_000 }),
    });
    mockGame = Promise.resolve({ status: 'ready', game: session.game });
    await renderRouter('src/app', { initialUrl: '/markets' });
    expect(screen.queryByText('Test banner')).not.toBeOnTheScreen();
  });

  it('report loads and clicks to telemetry', async () => {
    const session = await openApp('/markets');
    await fireEvent.press(screen.getByRole('button', { name: 'Load test banner' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Tap test banner' }));
    expect(session.sink.events.map((event) => [event.name, event.details])).toEqual(
      expect.arrayContaining([
        ['ad_banner_loaded', { screen: 'markets' }],
        ['ad_clicked', { placement: 'banner' }],
      ]),
    );
  });
});

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
      'mailto:ads@pocketmogul.example?subject=Report%20an%20ad%20in%20Pocket%20Mogul',
    );
  });
});
