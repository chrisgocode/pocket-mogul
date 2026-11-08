import { CURRENT_ECONOMY_VERSION, getContent } from '@/content';
import type { GameCommand } from '@/domain/commands';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { ownedBusiness } from '@/domain/testRules';

import { activityRow } from './activityView';
import type { Game } from './game';
import { startTestGameFrom, type TestGame } from './testGame';

const DAY_MS = 600_000;
const HOUR_MS = 3_600_000;
const LEFT_AT_MS = 1_800_000_000_000;

function startWith(business: Parameters<typeof ownedBusiness>[1]): Promise<TestGame> {
  const state: GameState = {
    ...freshGameState({
      saveId: 'staff',
      economyVersion: CURRENT_ECONOMY_VERSION,
      wallMs: LEFT_AT_MS,
    }),
    businesses: [ownedBusiness('vending', business)],
  };
  return startTestGameFrom(state);
}

const run = (game: Game, command: GameCommand) =>
  game.dispatch({ id: game.createCommandId(), command });

const vendingOf = (session: TestGame) => session.game.getSnapshot().state.businesses[0];

const titles = async (game: Game) =>
  (await game.readActivity()).map((entry) => activityRow(entry, getContent()).title);

describe('hiring and firing staff (BUS13)', () => {
  it('pays the signing fee from the treasury and records the new headcount', async () => {
    const session = await startWith({ treasuryCents: dollars('50') });
    const hire = { type: 'HireStaff', businessId: 'vending', role: 'sales', fromCount: 0 } as const;
    expect(await run(session.game, hire)).toMatchObject({ ok: true });
    expect(vendingOf(session)).toMatchObject({
      staff: { sales: 1 },
      treasuryCents: dollars('24.80'),
    });
    await run(session.game, { ...hire, type: 'FireStaff', fromCount: 1 });
    expect(await titles(session.game)).toEqual([
      'Vending Machine now has 0 sales staff',
      'Vending Machine now has 1 sales staff',
    ]);
  });

  it('applies a repeated command ID once', async () => {
    const session = await startWith({ treasuryCents: dollars('50') });
    const envelope = {
      id: 'hire-once',
      command: { type: 'HireStaff', businessId: 'vending', role: 'sales', fromCount: 0 },
    } as const;
    await session.game.dispatch(envelope);
    await session.game.dispatch(envelope);
    expect(vendingOf(session)?.treasuryCents).toBe(dollars('24.80'));
  });
});

describe('growing a stage (BUS15)', () => {
  it('upgrades once the business has been owned long enough', async () => {
    const session = await startWith({ units: 3, treasuryCents: dollars('500'), payoutPercent: 0 });
    const upgrade = { type: 'UpgradeStage', businessId: 'vending', fromStage: 1 } as const;
    expect(await run(session.game, upgrade)).toEqual({ ok: false, error: 'STAGE_NOT_READY' });
    session.clock.advance(3 * DAY_MS);
    expect(await run(session.game, upgrade)).toMatchObject({ ok: true });
    expect(vendingOf(session)).toMatchObject({ stage: 2 });
    expect(await titles(session.game)).toEqual(['Vending Machine grew to Local']);
  });
});

describe('a hired manager (AC43)', () => {
  it('moves to the most profitable price at each day boundary, offline too', async () => {
    const left = await startWith({
      stage: 2,
      staff: { operations: 1, sales: 0, manager: 1 },
      treasuryCents: dollars('100'),
    });
    const back = await left.restart({ awayMs: HOUR_MS });
    expect(vendingOf(back)).toMatchObject({ priceLevel: 'premium' });
    expect(await back.game.readActivity()).not.toContainEqual(
      expect.objectContaining({ kind: 'treasury' }),
    );
  });

  it('leaves the price as the player set it without a manager', async () => {
    const left = await startWith({ stage: 2, treasuryCents: dollars('100') });
    const back = await left.restart({ awayMs: HOUR_MS });
    expect(vendingOf(back)?.priceLevel).toBe('standard');
  });
});
