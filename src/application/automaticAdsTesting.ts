import { getContent, type Content } from '@/content';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';

import type { AutomaticAdStage } from './automaticAds';
import { scriptedAds, type AutomaticAdSetup } from './scriptedAds';
import type { TelemetryEvent } from './telemetry';
import { startTestGameFrom, type TestGame } from './testGame';

const WARM_UP_MS = getContent().economy.ads.gateAfterForegroundMs;
const LEFT_AT_MS = 1_800_000_000_000;

const pastTutorial: GameState = {
  ...freshGameState({ saveId: 'automatic-ads', economyVersion: 1, wallMs: LEFT_AT_MS }),
  cashCents: dollars('1000'),
  tutorial: { completedSteps: [], explanations: 'skipped' },
  goals: {
    completed: [
      { goalId: 'first_business', simulationMs: 0 },
      { goalId: 'peak_1k', simulationMs: 0 },
    ],
    pinnedGoalId: null,
  },
  businesses: [
    {
      definitionId: 'vending',
      levels: { capacity: 0, quality: 0, efficiency: 0 },
      managerOwned: false,
      capitalizedSpendCents: dollars('250'),
    },
  ],
};

function telemetryRecorder() {
  const events: TelemetryEvent[] = [];
  return { events, telemetry: { record: (event: TelemetryEvent) => void events.push(event) } };
}

export const automaticAdEvents = (events: readonly TelemetryEvent[]) =>
  events
    .filter((event) => event.name.startsWith('ad_') && event.name !== 'ad_requested')
    .map((event) => [event.name, event.details]);

export async function playFor(session: TestGame, ms: number): Promise<void> {
  session.clock.advance(ms);
  await session.game.flushTaps();
}

export type AdSession = TestGame & { readonly sink: ReturnType<typeof telemetryRecorder> };

export async function startAdSession(
  setup: {
    state?: GameState;
    interstitial?: AutomaticAdSetup;
    appOpen?: AutomaticAdSetup;
    content?: Content;
    warmUp?: 'played' | 'fresh';
  } = {},
): Promise<AdSession> {
  const sink = telemetryRecorder();
  const session = await startTestGameFrom(setup.state ?? pastTutorial, {
    content: setup.content ?? getContent(),
    telemetry: sink.telemetry,
    ads: scriptedAds({
      ...(setup.interstitial === undefined ? {} : { interstitial: setup.interstitial }),
      ...(setup.appOpen === undefined ? {} : { appOpen: setup.appOpen }),
    }),
  });
  if (setup.warmUp !== 'fresh') await playFor(session, WARM_UP_MS);
  return { ...session, sink };
}

export async function awayFor(session: TestGame, awayMs: number): Promise<void> {
  await session.game.pause();
  session.clock.advance(awayMs);
  await session.game.resume();
}

export async function breakAfterIdle(session: TestGame): Promise<void> {
  const breakDone = session.game.naturalBreak('left_home');
  session.clock.advance(getContent().economy.ads.adBreakCardMs);
  await breakDone;
}

export function untilAutomaticAd(session: TestGame, stage: AutomaticAdStage): Promise<void> {
  return new Promise((resolve) => {
    const unsubscribe = session.game.subscribe(() => {
      if (session.game.getSnapshot().automaticAd !== stage) return;
      unsubscribe();
      resolve();
    });
  });
}

export function repeat(times: number, step: () => Promise<void>): Promise<void> {
  return Array.from({ length: times }).reduce<Promise<void>>(
    (previous) => previous.then(step),
    Promise.resolve(),
  );
}
