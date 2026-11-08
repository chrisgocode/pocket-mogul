import { CURRENT_ECONOMY_VERSION, getContent } from '@/content';
import type { GameCommand } from '@/domain/commands';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { ownedBusiness } from '@/domain/testRules';

import { activityRow } from './activityView';
import type { Game } from './game';
import { selectReturnSummary } from './returnSummaryView';
import { startTestGameFrom, type TestGame } from './testGame';

const HOUR_MS = 3_600_000;
const DAY_MS = 600_000;
const SAFE_DAYS = 30;
const LEFT_AT_MS = 1_800_000_000_000;

function startWith(
  business: Parameters<typeof ownedBusiness>[1],
  ownedDays = 0,
): Promise<TestGame> {
  const fresh = freshGameState({
    saveId: 'risky',
    economyVersion: CURRENT_ECONOMY_VERSION,
    wallMs: LEFT_AT_MS,
  });
  const state: GameState = {
    ...fresh,
    clock: { ...fresh.clock, simulationMs: ownedDays * DAY_MS },
    businesses: [ownedBusiness('vending', business)],
  };
  return startTestGameFrom(state);
}

const run = (game: Game, command: GameCommand) =>
  game.dispatch({ id: game.createCommandId(), command });

const vendingOf = (session: TestGame) => session.game.getSnapshot().state.businesses[0];

const insure = {
  type: 'SetInsurance',
  businessId: 'vending',
  category: 'equipment',
  insured: true,
} as const;

describe('buying insurance (BUS17)', () => {
  it('is refused before Local', async () => {
    const session = await startWith({});
    expect(await run(session.game, insure)).toEqual({ ok: false, error: 'STAGE_LOCKED' });
  });

  it('starts and cancels a policy from Local, with no cash or treasury spent', async () => {
    const session = await startWith({ stage: 2, treasuryCents: dollars('50') });
    expect(await run(session.game, insure)).toMatchObject({ ok: true });
    expect(vendingOf(session)).toMatchObject({
      insurance: { equipment: 'active', liability: 'none', supply: 'none' },
      treasuryCents: dollars('50'),
    });
    await run(session.game, { ...insure, insured: false });
    expect(vendingOf(session)?.insurance.equipment).toBe('none');
  });
});

describe('incidents while away (BUS16, UX05)', () => {
  it('lists each incident in the return summary and the activity history', async () => {
    const left = await startWith({ treasuryCents: dollars('500') }, SAFE_DAYS);
    const back = await left.restart({ awayMs: 8 * HOUR_MS });
    const content = getContent();
    const summary = selectReturnSummary(back.game.getSnapshot().state, content);
    const newestFirst = await back.game.readActivity();
    const newestIncidents = newestFirst.filter((entry) => entry.kind === 'incident');
    const struck = newestIncidents.map(
      (_, index) => newestIncidents[newestIncidents.length - 1 - index]!,
    );
    expect(summary?.incidents.length).toBeGreaterThan(0);
    expect(summary?.incidents.map(({ title, detail }) => ({ title, detail }))).toEqual(
      struck.map((entry) => {
        const { title, detail } = activityRow(entry, content);
        return { title, detail: detail.replace(/^.+? · /, '') };
      }),
    );
    expect(summary?.incidents[0]?.title).toMatch(/^Vending Machine: /);
  });
});
