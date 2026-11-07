import { getContent } from '@/content';
import { freshGameState } from '@/domain/gameState';

import {
  automaticAdEvents,
  breakAfterIdle,
  playFor,
  repeat,
  startAdSession,
} from './automaticAdsTesting';

const SECOND_MS = 1_000;
const MINUTE_MS = 60 * SECOND_MS;

const suppressions = (session: Awaited<ReturnType<typeof startAdSession>>) =>
  session.sink.events
    .filter((event) => event.name === 'ad_interstitial_suppressed')
    .map((event) => event.details['reason']);

describe('natural-break interstitials', () => {
  it('shows an interstitial at a natural break once play has warmed up', async () => {
    const session = await startAdSession();
    await breakAfterIdle(session);
    expect(session.ads.automatic.interstitial.shows()).toBe(1);
    expect(session.game.getSnapshot().automaticAd).toBe('none');
  });

  it('shows a 1-second Ad break card first', async () => {
    const session = await startAdSession({ interstitial: { scripts: ['held'] } });
    const shown = session.game.naturalBreak('sheet_closed');
    expect(session.game.getSnapshot().automaticAd).toBe('adBreak');
    session.clock.advance(999);
    expect(session.ads.automatic.interstitial.shows()).toBe(0);
    session.clock.advance(1);
    await Promise.resolve();
    expect(session.ads.automatic.interstitial.shows()).toBe(1);
    expect(session.game.getSnapshot().automaticAd).toBe('interstitial');
    session.ads.automatic.interstitial.emit({ type: 'closed' });
    await shown;
    expect(session.game.getSnapshot().automaticAd).toBe('none');
  });

  it('never interrupts continuous tapping on Home and waits for 2.5 s idle (AC31)', async () => {
    const session = await startAdSession();
    await repeat(6 * 60, () => {
      session.game.tap();
      return playFor(session, SECOND_MS);
    });
    await session.game.naturalBreak('left_home');
    expect(session.ads.automatic.interstitial.shows()).toBe(0);
    expect(suppressions(session)).toEqual(['recent_tap']);
    await playFor(session, 2_500);
    await breakAfterIdle(session);
    expect(session.ads.automatic.interstitial.shows()).toBe(1);
  });

  it('shows nothing during the tutorial (AC32)', async () => {
    const state = freshGameState({ saveId: 'new', economyVersion: 1, wallMs: 1_800_000_000_000 });
    const session = await startAdSession({ state });
    await breakAfterIdle(session);
    expect(session.ads.automatic.interstitial.shows()).toBe(0);
    expect(suppressions(session)).toEqual(['tutorial']);
  });

  it('shows nothing while a boost is active (AC32)', async () => {
    const session = await startAdSession();
    await session.game.pressTapBoost();
    await session.game.flushTaps();
    await breakAfterIdle(session);
    expect(session.ads.automatic.interstitial.shows()).toBe(0);
    expect(suppressions(session)).toEqual(['boost_active']);
  });

  it('shows nothing within 2 minutes of a rewarded view (AC32)', async () => {
    const session = await startAdSession();
    await session.game.pressTapBoost();
    await session.game.flushTaps();
    await playFor(session, 61 * SECOND_MS);
    await breakAfterIdle(session);
    expect(suppressions(session)).toEqual(['recent_reward']);
    await playFor(session, MINUTE_MS);
    await breakAfterIdle(session);
    expect(session.ads.automatic.interstitial.shows()).toBe(1);
  });

  it('is suppressed when no ad loaded (no consent, offline or no fill) and retries the load', async () => {
    const session = await startAdSession({ interstitial: { fill: 'noFill' } });
    await breakAfterIdle(session);
    expect(suppressions(session)).toEqual(['not_loaded']);
    session.ads.automatic.interstitial.fill('fill');
    await breakAfterIdle(session);
    expect(session.ads.automatic.interstitial.shows()).toBe(0);
    await breakAfterIdle(session);
    expect(session.ads.automatic.interstitial.shows()).toBe(1);
    expect(suppressions(session)).toEqual(['not_loaded', 'not_loaded']);
  });
});

describe('interstitial frequency and triggers', () => {
  it('keeps 3 minutes of foreground time between interstitials (AC33)', async () => {
    const session = await startAdSession();
    await breakAfterIdle(session);
    await playFor(session, 3 * MINUTE_MS - 2 * SECOND_MS);
    await breakAfterIdle(session);
    expect(session.ads.automatic.interstitial.shows()).toBe(1);
    await playFor(session, SECOND_MS);
    await breakAfterIdle(session);
    expect(session.ads.automatic.interstitial.shows()).toBe(2);
  });

  it('does not count time in the background toward the gap (AC33)', async () => {
    const session = await startAdSession();
    await breakAfterIdle(session);
    await session.game.pause();
    session.clock.advance(10 * MINUTE_MS);
    await session.game.resume();
    await breakAfterIdle(session);
    expect(session.ads.automatic.interstitial.shows()).toBe(1);
  });

  it('shows at most 12 a local day (AC33)', async () => {
    const session = await startAdSession();
    await repeat(13, async () => {
      await breakAfterIdle(session);
      await playFor(session, 3 * MINUTE_MS);
    });
    expect(session.ads.automatic.interstitial.shows()).toBe(12);
    expect(suppressions(session)).toEqual(['daily_cap']);
  });

  it('opens a natural break when a goal completes', async () => {
    const session = await startAdSession();
    const bought = session.game.dispatch({
      id: 'first-wallet-upgrade',
      command: { type: 'UpgradeWallet', fromLevel: 0 },
    });
    await bought;
    session.clock.advance(getContent().economy.ads.adBreakCardMs);
    await session.game.flushTaps();
    expect(automaticAdEvents(session.sink.events)).toContainEqual([
      'ad_interstitial_shown',
      { trigger: 'goal_completed' },
    ]);
  });

  it('cancels the Ad break card when the player leaves the app', async () => {
    const session = await startAdSession();
    const shown = session.game.naturalBreak('left_home');
    await session.game.pause();
    session.clock.advance(SECOND_MS);
    await shown;
    expect(session.ads.automatic.interstitial.shows()).toBe(0);
    expect(session.game.getSnapshot().automaticAd).toBe('none');
  });
});

describe('schedule numbers', () => {
  it('come from the content configuration', async () => {
    const content = getContent();
    const quicker = {
      ...content,
      economy: { ...content.economy, ads: { ...content.economy.ads, interstitialMinGapMs: 1 } },
    };
    const session = await startAdSession({ content: quicker });
    await breakAfterIdle(session);
    await playFor(session, 3 * SECOND_MS);
    await breakAfterIdle(session);
    expect(session.ads.automatic.interstitial.shows()).toBe(2);
  });
});
