import {
  awayFor,
  breakAfterIdle,
  startAdSession,
  untilAutomaticAd,
  type AdSession,
} from './automaticAdsTesting';
import { scriptedAds } from './scriptedAds';
import { currentState } from './testGame';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const LONG_AWAY_MS = 31 * MINUTE_MS;

const summary = (session: AdSession) => session.game.getSnapshot().state.returnSummary;
const appOpenShows = (session: AdSession) => session.ads.automatic.appOpen.shows();

const settlements = (session: AdSession) =>
  session.receiptIds().filter((id) => id.startsWith('settle-')).length;

async function acknowledgeSummary(session: AdSession): Promise<void> {
  await session.game.dispatch({
    id: session.game.createCommandId(),
    command: { type: 'AcknowledgeReturnSummary' },
  });
}

async function thirdSession(session: AdSession): Promise<void> {
  await awayFor(session, LONG_AWAY_MS);
  expect(appOpenShows(session)).toBe(0);
}

describe('app open ads', () => {
  it('never show on a cold start', async () => {
    const session = await startAdSession();
    const relaunched = await session.restart({ awayMs: 5 * HOUR_MS });
    expect(relaunched.ads.automatic.appOpen.shows()).toBe(0);
    expect(relaunched.game.getSnapshot().automaticAd).toBe('none');
  });

  it('show on a warm resume from the third session after 30 minutes away', async () => {
    const session = await startAdSession();
    await thirdSession(session);
    await awayFor(session, 29 * MINUTE_MS);
    expect(appOpenShows(session)).toBe(0);
    await awayFor(session, LONG_AWAY_MS);
    expect(appOpenShows(session)).toBe(1);
  });

  it('show at most once every 4 hours', async () => {
    const session = await startAdSession();
    await thirdSession(session);
    await awayFor(session, LONG_AWAY_MS);
    await awayFor(session, LONG_AWAY_MS);
    expect(appOpenShows(session)).toBe(1);
    await awayFor(session, 4 * HOUR_MS);
    expect(appOpenShows(session)).toBe(2);
  });

  it('come after offline settlement and before the return summary', async () => {
    const session = await startAdSession({ appOpen: { scripts: ['held'] } });
    await thirdSession(session);
    await acknowledgeSummary(session);
    await session.game.pause();
    session.clock.advance(LONG_AWAY_MS);
    const showing = untilAutomaticAd(session, 'appOpen');
    const resumed = session.game.resume();
    await showing;
    expect(appOpenShows(session)).toBe(1);
    expect(currentState(session.saveDocument()).returnSummary).toMatchObject({
      status: 'pending',
    });
    expect(summary(session)).toEqual({ status: 'none' });
    expect(session.game.getSnapshot().automaticAd).toBe('appOpen');
    session.ads.automatic.appOpen.emit({ type: 'closed' });
    await resumed;
    expect(summary(session)).toMatchObject({ status: 'pending' });
    expect(session.game.getSnapshot().automaticAd).toBe('none');
  });

  it('reset the interstitial gap, so the two never come back to back', async () => {
    const session = await startAdSession();
    await thirdSession(session);
    await awayFor(session, LONG_AWAY_MS);
    await breakAfterIdle(session);
    expect(session.ads.automatic.interstitial.shows()).toBe(0);
  });
});

describe('closing a full-screen ad on Android (AC34)', () => {
  it('after an interstitial causes no settlement, summary or app open ad', async () => {
    const session = await startAdSession({ interstitial: { scripts: ['held'] } });
    await thirdSession(session);
    await acknowledgeSummary(session);
    const settledBefore = settlements(session);
    const shown = session.game.naturalBreak('left_home');
    session.clock.advance(1_000);
    await Promise.resolve();
    await session.game.pause();
    session.clock.advance(LONG_AWAY_MS);
    await session.game.resume();
    session.ads.automatic.interstitial.emit({ type: 'closed' });
    await shown;
    await session.game.flushTaps();
    expect(appOpenShows(session)).toBe(0);
    expect(summary(session)).toEqual({ status: 'none' });
    expect(settlements(session)).toBe(settledBefore);
  });

  it('after an app open ad causes no second settlement, summary or app open ad', async () => {
    const session = await startAdSession({ appOpen: { scripts: ['held'] } });
    await thirdSession(session);
    await acknowledgeSummary(session);
    await session.game.pause();
    session.clock.advance(LONG_AWAY_MS);
    const showing = untilAutomaticAd(session, 'appOpen');
    const resumed = session.game.resume();
    await showing;
    const settledBefore = settlements(session);
    await session.game.pause();
    session.clock.advance(5 * HOUR_MS);
    await session.game.resume();
    session.ads.automatic.appOpen.emit({ type: 'closed' });
    await resumed;
    await session.game.flushTaps();
    expect(appOpenShows(session)).toBe(1);
    expect(settlements(session)).toBe(settledBefore);
  });
});

const relaunch = async (session: AdSession) => {
  await session.game.checkpoint();
  const next = await session.restart({ awayMs: MINUTE_MS, ads: scriptedAds() });
  return { ...next, sink: session.sink };
};

describe('the ad schedule across launches', () => {
  it('counts launches as sessions, so the third launch can show one on warm resume', async () => {
    const third = await relaunch(await relaunch(await startAdSession()));
    expect(appOpenShows(third)).toBe(0);
    await awayFor(third, LONG_AWAY_MS);
    expect(appOpenShows(third)).toBe(1);
  });

  it('keeps the interstitial count, the gap and the warm-up after a restart', async () => {
    const session = await startAdSession();
    await breakAfterIdle(session);
    const relaunched = await relaunch(session);
    await breakAfterIdle(relaunched);
    expect(relaunched.ads.automatic.interstitial.shows()).toBe(0);
    await relaunched.game.checkpoint();
    expect(currentState(relaunched.saveDocument()).adSchedule).toMatchObject({
      foregroundMs: 5 * MINUTE_MS + 2_000,
      sinceFullScreenAdMs: 1_000,
      interstitials: { count: 1 },
      sessions: 2,
    });
  });
});
