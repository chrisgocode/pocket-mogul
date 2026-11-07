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
