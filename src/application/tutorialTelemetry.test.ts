import type { TelemetryEvent } from './telemetry';
import { startObservedTestGame } from './testGame';

function recorder() {
  const events: TelemetryEvent[] = [];
  return { events, telemetry: { record: (event: TelemetryEvent) => void events.push(event) } };
}

const tutorialSteps = (events: readonly TelemetryEvent[]) =>
  events.filter((event) => event.name === 'tutorial_step').map((event) => event.details);

const tap = (id: string, taps: number) => ({ id, command: { type: 'TapBatch', taps } }) as const;
const upgradeWallet = { id: 'wallet', command: { type: 'UpgradeWallet', fromLevel: 0 } } as const;
const buyVending = { id: 'buy', command: { type: 'BuyBusiness', businessId: 'vending' } } as const;

describe('tutorial telemetry', () => {
  it('records each step once, from the commit that completes it', async () => {
    const sink = recorder();
    const { game } = await startObservedTestGame({ telemetry: sink.telemetry });
    await game.dispatch(tap('first', 1));
    await game.dispatch(tap('more', 399));
    await game.dispatch(upgradeWallet);
    await game.dispatch(buyVending);
    expect(tutorialSteps(sink.events)).toEqual([
      { step: 'tap', number: 1 },
      { step: 'upgradeWallet', number: 2 },
      { step: 'buyBusiness', number: 3 },
    ]);
  });

  it('records nothing for a replayed command, a restart or a skip', async () => {
    const sink = recorder();
    const session = await startObservedTestGame({ telemetry: sink.telemetry });
    await session.game.dispatch(tap('first', 1));
    await session.game.dispatch(tap('first', 1));
    await session.game.dispatch({ id: 'skip', command: { type: 'SkipTutorial' } });
    const restarted = recorder();
    await session.restart({ telemetry: restarted.telemetry });
    expect(tutorialSteps(sink.events)).toEqual([{ step: 'tap', number: 1 }]);
    expect(tutorialSteps(restarted.events)).toEqual([]);
  });

  it('sends the usual envelope and no save identifier', async () => {
    const sink = recorder();
    const { game } = await startObservedTestGame({ telemetry: sink.telemetry });
    await game.dispatch(tap('first', 1));
    const { state } = game.getSnapshot();
    expect(sink.events.find((event) => event.name === 'tutorial_step')).toMatchObject({
      economyVersion: state.economyVersion,
      schemaVersion: state.schemaVersion,
      state: { totalAcceptedTaps: 1 },
    });
    expect(JSON.stringify(sink.events)).not.toContain(state.saveId);
  });
});
