import {
  automaticAdEvents,
  awayFor,
  breakAfterIdle,
  playFor,
  repeat,
  startAdSession,
} from './automaticAdsTesting';
import { scriptedAds, type AdScript } from './scriptedAds';
import type { TelemetryEvent } from './telemetry';
import { startObservedTestGame } from './testGame';

function recorder() {
  const events: TelemetryEvent[] = [];
  return { events, telemetry: { record: (event: TelemetryEvent) => void events.push(event) } };
}

const adEvents = (events: readonly TelemetryEvent[]) =>
  events
    .filter((event) => event.name.startsWith('ad_') || event.name === 'boost_activated')
    .map((event) => [event.name, event.details]);

async function watchAd(script: AdScript) {
  const sink = recorder();
  const session = await startObservedTestGame({
    telemetry: sink.telemetry,
    ads: scriptedAds({ scripts: [script] }),
  });
  await session.game.pressTapBoost();
  await session.game.flushTaps();
  return { sink, session };
}

describe('Tap Boost telemetry', () => {
  it('records the load and show requests, the reward and the boost', async () => {
    const { sink } = await watchAd('success');
    expect(adEvents(sink.events)).toEqual([
      ['ad_requested', { placement: 'tap_boost', request: 'load' }],
      ['ad_requested', { placement: 'tap_boost', request: 'show' }],
      ['ad_requested', { placement: 'tap_boost', request: 'load' }],
      ['ad_rewarded', { placement: 'tap_boost' }],
      ['boost_activated', { tapMultiplier: 5, durationMs: 60_000 }],
    ]);
  });

  it('records a reward delivered twice only once', async () => {
    const { sink } = await watchAd('duplicateReward');
    const names = sink.events.map((event) => event.name);
    expect(names.filter((name) => name === 'ad_rewarded')).toHaveLength(1);
    expect(names.filter((name) => name === 'boost_activated')).toHaveLength(1);
  });

  it('records no reward or boost when the ad closes early', async () => {
    const { sink } = await watchAd('closeWithoutReward');
    const names = sink.events.map((event) => event.name);
    expect(names).not.toContain('ad_rewarded');
    expect(names).not.toContain('boost_activated');
  });

  it('records the boost when a saved grant activates on the next launch', async () => {
    const { session } = await watchAd('crashAfterReward');
    const sink = recorder();
    await session.restart({ telemetry: sink.telemetry, ads: scriptedAds() });
    expect(sink.events.map((event) => event.name)).toContain('boost_activated');
    expect(sink.events.map((event) => event.name)).not.toContain('ad_rewarded');
  });

  it('sends the usual envelope and no presentation or save identifiers', async () => {
    const { sink, session } = await watchAd('success');
    const rewarded = sink.events.find((event) => event.name === 'ad_rewarded');
    const { state } = session.game.getSnapshot();
    expect(rewarded).toMatchObject({
      economyVersion: state.economyVersion,
      schemaVersion: state.schemaVersion,
      simulationMs: expect.any(Number) as number,
      state: { walletLevel: 0 },
    });
    const sent = JSON.stringify(sink.events);
    expect(sent).not.toContain(state.saveId);
    expect(sent).not.toContain(state.reward.processedRewardIds[0]);
  });
});

describe('automatic ad telemetry', () => {
  it('records interstitials shown and suppressed, with the trigger and reason', async () => {
    const session = await startAdSession({ interstitial: { scripts: ['clickThenClose'] } });
    session.game.tap();
    await session.game.naturalBreak('sheet_closed');
    await playFor(session, 3_000);
    await breakAfterIdle(session);
    expect(automaticAdEvents(session.sink.events)).toEqual([
      ['ad_interstitial_suppressed', { trigger: 'sheet_closed', reason: 'recent_tap' }],
      ['ad_clicked', { placement: 'interstitial' }],
      ['ad_interstitial_shown', { trigger: 'left_home' }],
    ]);
  });

  it('records an app open ad with the time away', async () => {
    const session = await startAdSession();
    await repeat(3, () => awayFor(session, 31 * 60_000));
    expect(automaticAdEvents(session.sink.events)).toEqual([
      ['ad_app_open_shown', { awayMs: 31 * 60_000 }],
    ]);
  });

  it('records banner loads by screen and banner clicks', async () => {
    const session = await startAdSession();
    session.game.reportBanner('loaded', 'markets');
    session.game.reportBanner('clicked', 'markets');
    expect(automaticAdEvents(session.sink.events)).toEqual([
      ['ad_banner_loaded', { screen: 'markets' }],
      ['ad_clicked', { placement: 'banner' }],
    ]);
  });

  it('sends the usual envelope and no save or ad identifiers', async () => {
    const session = await startAdSession();
    await breakAfterIdle(session);
    const shown = session.sink.events.find((event) => event.name === 'ad_interstitial_shown');
    const { state } = session.game.getSnapshot();
    expect(shown).toMatchObject({
      economyVersion: state.economyVersion,
      schemaVersion: state.schemaVersion,
      simulationMs: expect.any(Number) as number,
      state: { businessesOwned: 1 },
    });
    const sent = JSON.stringify(session.sink.events);
    expect(sent).not.toContain(state.saveId);
    expect(sent).not.toContain('ca-app-pub');
  });
});
